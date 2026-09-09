import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KARGO / TESLİM DAMGASI — MUTASYON HARNESS'İ (K195 + K195-2)
 * ----------------------------------------------------------------------------
 *      npm run kargo-damgasi-mutasyon:kontrol
 *
 *  ⛔ NİYE KALICI: K195'te dokuz mutasyon ELLE koşuldu ve kırmızı yandığı
 *  görüldü — ama hiçbir yere yazılmadı. Elle koşulan bir mutasyon, koşulduğu
 *  turda VARDIR ve ertesi gün YOKTUR: yarın gövdeyi refaktör eden kişi aynı
 *  korumaların ayakta kalıp kalmadığını göremez.
 *  _(Anayasa: "ölçüt mutasyonsuz teslim edilmez" — ve bir ölçümün TEKRAR
 *  EDİLEBİLİR olması, ölçümün kendisi kadar önemlidir.)_
 *
 *  ⚠ ÜÇ HEDEF DOSYA: karar saf gövdede, yazım içe aktarmalarda. İkisi ayrı
 *  ayrı bozulabilir ve biri bozulduğunda öteki hâlâ doğru çalışır — yani tek
 *  dosyayı sınayan bir tur, ötekini korumasız bırakır.
 * ============================================================================
 */

const BEKCI = "scripts/kargo-damgasi-dogrula.ts";
const BEKCI_BASLIGI = "KARGO DAMGASI BEKÇİSİ";
const GOVDE = "src/lib/kanal-kargo-damgasi.ts";
const TY = "scripts/canli-ty-ice-aktar.ts";
const HB = "scripts/canli-hb-ice-aktar.ts";

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
    ad: "DOLU TESLİM DAMGASI EZİLİYOR",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  if (kanal.teslimAni !== null && mevcut.deliveredAt === null) {",
    koy: "  if (kanal.teslimAni !== null) {",
    bozdugu:
      "elle girilmis teslim tarihi her cekimde kanalinkiyle degisir — K60 yasaginin teslim tarafi",
  },
  {
    ad: "KANAL SUSUNCA TAKİP BAĞLANTISI SİLİNİYOR",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  if (kanal.takipBaglantisi !== null && kanal.takipBaglantisi !== mevcut.kargoTakipBaglantisi) {",
    koy: "  if (kanal.takipBaglantisi !== mevcut.kargoTakipBaglantisi) {",
    bozdugu:
      "kanal o turda bir sey soylemediyse elimizdeki baglanti SILINIR — susmak 'yok' sayilir",
  },
  {
    ad: "AYNI TAKİP HER TURDA YENİDEN YAZILIYOR",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  if (kanal.takipBaglantisi !== null && kanal.takipBaglantisi !== mevcut.kargoTakipBaglantisi) {",
    koy: "  if (kanal.takipBaglantisi !== null) {",
    bozdugu:
      "5 dakikada bir onlarca gereksiz yazma; degismeyen deger her turda geri yazilir",
  },
  {
    ad: "KARGO FİRMASI HİÇ TAZELENMİYOR",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (kanal.kargoFirmasi !== null && kanal.kargoFirmasi !== mevcut.kanalKargoFirmasi) {",
    koy: "  if (false) {",
    bozdugu:
      "kanal firmayi degistirse bile defterde eski ad kalir; tarife/maliyet farki gorunmez olur",
  },
  {
    ad: "GEÇMİŞTEN İLK DAMGA ALINIYOR (en geç yerine)",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "    if (enSon === null || ms > enSon) enSon = ms;",
    koy: "    if (enSon === null) enSon = ms;",
    bozdugu:
      "iptal edilip yeniden kargolanan pakette ILK deneme yazilir — 'ilk denemede gitti' denir",
  },
  {
    ad: "DURUM SÜZGECİ KALKTI",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "    if (h.status !== durum) continue;",
    koy: "",
    bozdugu:
      "Delivered arayinca Created/Shipped damgasi doner; teslim tarihi siparis tarihine kayar",
  },
  {
    ad: "HB NAİF new Date() KULLANIYOR (dilim tuzağı)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  const gun = gunMetninden(dize.slice(0, 10));",
    koy: "  const gun = new Date(dize);",
    bozdugu:
      "dilimsiz dize kostugu yere gore farkli AN uretir; gece yarisina yakin damgada GUN de kayar",
  },
  {
    ad: "TY TESLİM ALANINA UYDURMA TARİH YAZIYOR",
    yon: "FAZLADAN",
    dosya: TY,
    bul: "          deliveredAt: a.teslimAni,",
    koy: "          deliveredAt: a.teslimAni ?? new Date(),",
    bozdugu:
      "kanal teslim demediginde bugunun tarihi basilir — K60'ta 5601 siparise yapilan sey",
  },
  {
    /**
     * ⛔ TABAN DOLULUĞU ÖLÇÜTÜNÜ SINAR. Bekçi "deliveredAt yazan en az 3 içe
     * aktarma var" diyor; o ölçüt kendisi de sınanmalı, yoksa bir kanal
     * yazmayı bıraktığında tur sessizce yeşil kalır.
     * ⚠ Bu mutasyon TY'de yalnız `deliveredAt: true` (SELECT satırı) bırakır
     * — tam da ölçütün "geçiyor" ile "atanıyor"u ayırt etmesi gereken hâl.
     */
    ad: "TY TESLİM ALANINI HİÇ YAZMIYOR (taban düşer)",
    yon: "KALDIRAN",
    dosya: TY,
    bul: "          deliveredAt: a.teslimAni,",
    koy: "",
    bozdugu:
      "bir kanal teslim yazmayi birakir; taban olculmezse tur sessizce yesil kalir",
  },
  {
    ad: "HB DOLU TESLİM DAMGASINI EZİYOR",
    yon: "FAZLADAN",
    dosya: HB,
    bul: "      where: { code: no, channelAccountId: hesap.id, deliveredAt: null },",
    koy: "      where: { code: no, channelAccountId: hesap.id },",
    bozdugu: "dolu bir teslim damgasi her cekimde kanalin gunuyle ezilir",
  },
  {
    ad: "DOLU KANAL DESİSİ EZİLİYOR",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  if (kanal.kanalDesi !== null && mevcut.kanalKargoDesi === null) {",
    koy: "  if (kanal.kanalDesi !== null) {",
    bozdugu:
      "tasiyicinin TARTTIGI desi her cekimde yeniden yazilir; olculmus bir olay degistirilebilir olur",
  },
  {
    /**
     * ⛔ HALİL'İN AÇIK ŞARTI: "defter kargo/NET'e DOKUNMAZ, bekçi bunu
     * doğrular." Bir "dokunmuyor" iddiası, DOKUNAN bir mutasyon kırmızı
     * yanmadıkça korunmuş sayılmaz.
     */
    ad: "İÇE AKTARMA KARGO TUTARINA DOKUNUYOR",
    yon: "FAZLADAN",
    dosya: TY,
    bul: "          kanalKargoDesi: a.kanalDesi,",
    koy:
      "          kanalKargoDesi: a.kanalDesi,\n" +
      "          cargoAmount: 0,",
    bozdugu:
      "ice aktarma defterdeki kargo maliyetini yazmaya baslar; NET sessizce degisir",
  },
  {
    ad: "HB DOLU KANAL DESİSİNİ EZİYOR",
    yon: "FAZLADAN",
    dosya: HB,
    bul: "      where: { code: no, channelAccountId: hesap.id, kanalKargoDesi: null },",
    koy: "      where: { code: no, channelAccountId: hesap.id },",
    bozdugu: "dolu bir kanal desisi her cekimde yeniden yazilir",
  },
  {
    ad: "TY KANAL DESİSİNİ HİÇ YAZMIYOR (taban düşer)",
    yon: "KALDIRAN",
    dosya: TY,
    bul: "          kanalKargoDesi: a.kanalDesi,",
    koy: "",
    bozdugu:
      "bir kanal desi yazmayi birakir ve taban olculmezse tur sessizce yesil kalir",
  },
  {
    ad: "TESLİM KARARI SATIR İÇİNE KOPYALANDI",
    yon: "KALDIRAN",
    dosya: TY,
    bul: "    const veri = teslimGuncellemesi(s, {",
    koy: "    const veri = teslimKarariYerelKopya(s, {",
    bozdugu:
      "ortak govde ayakta kalir ve DEGER testleri YESIL yanar — ama onu kimse cagirmaz",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("KARGO / TESLİM DAMGASI — MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı) — " + m.dosya);
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    /**
     * ⛔ MUTASYONUN UYGULANDIĞI DOĞRULANIR — "uygulanamadı" YEŞİL DEĞİLDİR.
     * Desen tutmazsa `replace` sessizce hiçbir şey yapmaz; bekçi o zaman
     * DOĞRU kodu ölçer, yeşil yanar ve harness bunu "koruma var" diye okur.
     */
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /**
     * ⛔ GERİ ALMA `git checkout` İLE YAPILMAZ: commit edilmemiş çalışmayı
     * siler (02.09 vakası). Asıl içerik bellekte tutulur ve o geri yazılır.
     */
    writeFileSync(m.dosya, asil, "utf8");
  }

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

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI:\n");
  for (const b of bozuk) console.log("  !! " + b);
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
    "   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  kargo/teslim damgası İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
