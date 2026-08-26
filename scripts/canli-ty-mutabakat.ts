import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, baslikKur, kimlikOku, tumSayfalar } from "./ty/istemci";

/**
 * ============================================================================
 *  A3-② TRENDYOL MUTABAKATI — SALT OKUMA, HİÇBİR YERE YAZMAZ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ty-mutabakat -- --gun=30
 *
 *  ⚠ TEK "FARK" RAKAMI YOK — DÖRT KOVA AYRI (kullanıcı şartı 26.08.2026):
 *    (a) API'de VAR, defterde YOK          → gerçek boşluk adayı
 *    (b) İKİSİNDE DE VAR, alanlar tutuyor  → temiz
 *    (c) İKİSİNDE DE VAR, ALAN FARKI       → hangi alan, adıyla
 *    (d) Defterde VAR, API'de YOK          → ters yön
 *
 *  ⚠ (d) BOŞ ÇIKMAYABİLİR VE ÇIKMAZSA EN İLGİNÇ BULGU ODUR: yanlış
 *  kanala/hesaba yazılmış kayıt · iptal · test kaydı. Tek "fark" rakamı
 *  üretilseydi bu yön hiç görünmezdi.
 *
 *  ⚠ KAPSAM BEYANI RAKAMLARDAN ÖNCE YAZILIR. Anayasa: _"iki taraf aynı
 *  kümeyi kapsamıyorsa çıkan sayı fark değil KAPSAM BOŞLUĞUDUR"_ — ve
 *  çerçeve rapor içinde değil BAŞINDA görünmeli.
 *
 *  ⚠ HİÇBİR YAZMA. `prisma` yalnız `findMany`/`count` çağırıyor; bu dosyada
 *  `create`/`update`/`delete` geçmiyor ve `api:dogrula` bekçisi bunu
 *  koşulur hâlde tutuyor.
 * ============================================================================
 */

const gunArg = process.argv.find((a) => a.startsWith("--gun="));
/** ⚠ 90 GÜN TAVANI ÖLÇÜLDÜ (A3-①b): sipariş ucu tek istekte 90 günü kabul ediyor. */
const GUN = Math.min(Number(gunArg?.split("=")[1] ?? 30) || 30, 90);

/** Kuruş kıyası — `Decimal`→float kuyruğu sahte fark üretmesin. */
const kurus = (n: number) => Math.round(n * 100) / 100;

/** İstanbul takvim günü (`YYYY-MM-DD`) — iki taraf aynı takvimden okunsun. */
function istanbulGunu(an: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(an);
  return p;
}

type ApiKalem = {
  quantity: number;
  barcode: string;
  price: number;
  amount: number;
  discount: number;
};
type ApiPaket = {
  orderNumber: string;
  grossAmount: number;
  totalDiscount: number;
  orderDate: number;
  status: string;
  cargoTrackingNumber: number | null;
  shipmentPackageId: number;
  lines: ApiKalem[];
};

/** Aynı sipariş numarası birden çok PAKET olarak gelebilir — birleştirilir. */
type DefterSatisi = {
  kod: string;
  gun: string;
  iptalMi: boolean;
  kargoNo: string | null;
  paketSayisi: number;
  adet: number;
  tutar: number;
};

type ApiSiparis = {
  siparisNo: string;
  paketSayisi: number;
  /** Faturalanacak tutar = brüt − indirim (Halil defterine bunu giriyor). */
  tutar: number;
  adet: number;
  gun: string;
  durumlar: string[];
  kargoNolari: string[];
};

async function main() {
  const k = kimlikOku();
  if (!k) {
    console.log("\n⛔ ANAHTAR OKUNAMADI — `.env.canli` içinde üçü de dolu olmalı:");
    console.log("   TRENDYOL_SATICI_ID · TRENDYOL_API_KEY · TRENDYOL_API_SECRET\n");
    process.exitCode = 1;
    return;
  }
  const cozum = canliYapilandirma();
  if (!cozum.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI:", cozum.hata.kod, "\n");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(cozum.veri.ham) });
  const baslik = baslikKur(k);

  const son = Date.now();
  const bas = son - GUN * 86_400_000;
  const okumaAni = new Date();

  // ═══ 1) API TARAFI — DİLİMLEYEREK ═════════════════════════════════════
  /**
   * ═══ EN PAHALI BULGU: TEK GENİŞ PENCERE SESSİZCE EKSİK DÖNER ════════
   * ⚠ ÖLÇÜLDÜ 26.08.2026 ve ilk tasarımı ÇÖPE ATTI:
   *     tek 90 günlük pencere  →  114 kayıt (`totalPages: 1`)
   *     13 × 7 günlük dilim    →  804 FARKLI sipariş
   *   Yani tek istek gerçeğin **yedide birini** döndürüyor ve bunu
   *   `totalElements: 114` diyerek, hiçbir hata vermeden yapıyor.
   *
   * ⚠ VE `startDate/endDate` `orderDate`i SÜZMÜYOR — paketin SON
   *   DEĞİŞİKLİK anını süzüyor. Ölçüm: `10.08→27.08` penceresi
   *   `orderDate 04.08→21.08` döndürdü. İlk tasarım bunu `orderDate`
   *   sanmıştı; o varsayımla üretilen (a)=104 ve (d)=74 rakamları
   *   **fark değil KAPSAM BOŞLUĞUYDU** ve yayımlanmadan yakalandı.
   *   _(Anayasa: "kolon başlığı bir iddiadır" + "kontrol tasarımı, veri
   *   kapsamı doğrulanmadan fark üretmez".)_
   *
   * ⚠ DİLİM 3 GÜN — ÖLÇÜLEREK SEÇİLDİ, YUVARLAK SAYI DEĞİL:
   *     14 gün → 234 · 7 gün → 234 · **3 gün → 260** · 1 gün → 198 (5 hata)
   *   1 günlük dilim daha az buluyor çünkü istekler hata almaya başlıyor.
   *
   * ⛔ VE YAKINSAMA SAĞLANMADI: 3 günlük dilim 7 günlükten 26 kayıt fazla
   *   buluyor. Yani **API tarafı bir ALT SINIRDIR**, tam sayım değil.
   *   Bunun raporda iki sonucu var ve ikisi de aşağıda beyan ediliyor.
   */
  const DILIM_GUN = 3;
  const apiKayitlari = new Map<number, ApiPaket>();
  let dilimIstek = 0;
  let dilimHata = 0;
  let sayfaAsanDilim = 0;

  /**
   * ⚠ DEĞİŞİKLİK PENCERESİ HEDEF PENCEREDEN GENİŞ. Hedef dönemde VERİLEN
   * bir sipariş, sonraki haftalarda da değiştirilmiş olabilir; yalnız hedef
   * pencereyi tararsak o siparişi hiç görmeyiz. Fazladan taranan aralık
   * zararsız — `orderDate` süzgeci sonradan uygulanıyor.
   */
  const tarananGun = Math.min(GUN + 30, 90);
  for (let i = 0; i * DILIM_GUN < tarananGun; i++) {
    const dSon = son - i * DILIM_GUN * 86_400_000;
    const dBas = dSon - DILIM_GUN * 86_400_000;
    const dilim = await tumSayfalar(
      (sayfa) => UCLAR.siparisler(k.saticiId, dBas, dSon, sayfa),
      baslik,
    );
    dilimIstek++;
    if (dilim.tur === "HATA") {
      dilimHata++;
      continue;
    }
    if (dilim.kesildiMi) sayfaAsanDilim++;
    for (const ham of dilim.kayitlar as ApiPaket[]) {
      /** Paket kimliği tekil — aynı paket iki dilimde de gelebilir. */
      apiKayitlari.set(ham.shipmentPackageId, ham);
    }
  }

  if (apiKayitlari.size === 0) {
    console.log("\n⛔ API'DEN HİÇ KAYIT GELMEDİ.");
    console.log(`   ${dilimIstek} dilim denendi, ${dilimHata} hata.`);
    console.log("   ⚠ HÜKÜM VERİLMEZ — kıyas kurulamadı, 'fark yok' DENMEZ.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  /**
   * ⚠ HEDEF PENCERE `orderDate` İLE İSTEMCİDE SÜZÜLÜYOR — sunucu bunu
   * yapamıyor (süzgeci değişiklik anına bakıyor).
   */
  const paketler = [...apiKayitlari.values()].filter(
    (p) => p.orderDate >= bas && p.orderDate <= son,
  );
  const pencereDisi = apiKayitlari.size - paketler.length;

  /** ⚠ PAKET ≠ SİPARİŞ. Bölünmüş sipariş iki paket olarak geliyor. */
  const apiHarita = new Map<string, ApiSiparis>();
  for (const p of paketler) {
    const no = String(p.orderNumber);
    const kalemAdet = (p.lines ?? []).reduce((t, l) => t + (l.quantity ?? 0), 0);
    const tutar = kurus((p.grossAmount ?? 0) - (p.totalDiscount ?? 0));
    const mevcut = apiHarita.get(no);
    if (mevcut) {
      mevcut.paketSayisi++;
      mevcut.tutar = kurus(mevcut.tutar + tutar);
      mevcut.adet += kalemAdet;
      mevcut.durumlar.push(p.status);
      if (p.cargoTrackingNumber) mevcut.kargoNolari.push(String(p.cargoTrackingNumber));
    } else {
      apiHarita.set(no, {
        siparisNo: no,
        paketSayisi: 1,
        tutar,
        adet: kalemAdet,
        gun: istanbulGunu(new Date(p.orderDate)),
        durumlar: [p.status],
        kargoNolari: p.cargoTrackingNumber ? [String(p.cargoTrackingNumber)] : [],
      });
    }
  }

  // ═══ 2) DEFTER TARAFI ═════════════════════════════════════════════════
  /**
   * ⚠ HESAP KİMLİKLE BULUNUYOR, ADLA DEĞİL. Anayasa: _"ad bir ETİKETTİR;
   * eşleştirme KİMLİKLE yapılır."_ Anahtar hangi satıcıya aitse defterin o
   * hesabıyla kıyaslanır.
   */
  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: k.saticiId },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });
  if (!hesap) {
    console.log(`\n⛔ KAPSAM KURULAMADI: \`externalId = ${k.saticiId}\` olan kanal hesabı YOK.`);
    console.log("   ⚠ Ad benzerliğine göre eşleştirme YAPILMADI — yanlış hesapla");
    console.log("     kıyas, olmayan bir fark üretirdi.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const defterSatislari = await prisma.sale.findMany({
    where: {
      channelAccountId: hesap.id,
      soldAt: { gte: new Date(bas), lte: new Date(son) },
    },
    select: {
      code: true,
      soldAt: true,
      iptalTarihi: true,
      shipmentCode: true,
      paketSayisi: true,
      items: { select: { quantity: true, unitPriceAmount: true } },
    },
  });

  /**
   * ⚠ `Sale.code` NULLABLE — VE DERLEME BUNU YAKALADI. Kodu olmayan bir
   * satış sipariş numarasıyla EŞLEŞTİRİLEMEZ; sessizce düşseydi rapor
   * onu (d) kovasına bile koymazdı ve "defterde şu kadar satış var"
   * cümlesi eksik bir kümeyi anlatırdı.
   *
   * ⚠ AYRI SAYILIYOR — "İNCELENEMEYEN" kovası. Anayasa: _"boş sonuç ile
   * temiz sonucu ayırt edemeyen denetim, denetim değildir; kaç kayıt
   * incelenemedi ve NEDEN, ayrı yazılır."_
   */
  const kodsuzSatis = defterSatislari.filter((s) => s.code === null).length;

  const defterHarita = new Map<string, DefterSatisi>(
    defterSatislari
      .filter((s): s is typeof s & { code: string } => s.code !== null)
      .map((s) => [
      s.code,
      {
        kod: s.code,
        gun: istanbulGunu(s.soldAt),
        iptalMi: s.iptalTarihi !== null,
        kargoNo: s.shipmentCode,
        paketSayisi: s.paketSayisi,
        adet: s.items.reduce((t, i) => t + i.quantity, 0),
        tutar: kurus(
          s.items.reduce(
            (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
            0,
          ),
        ),
      },
    ]),
  );

  // ═══ 3) KAPSAM BEYANI — RAKAMLARDAN ÖNCE ══════════════════════════════
  const cizgi = "=".repeat(76);
  console.log("\n" + cizgi);
  console.log("A3-② TRENDYOL MUTABAKATI — SALT OKUMA");
  console.log(cizgi);
  console.log("\nKAPSAM BEYANI  (rakamlardan ÖNCE — kıyasın çerçevesi budur)");
  console.log(`  kanal            ${hesap.channel.name}`);
  console.log(`  hesap            ${hesap.name}  (externalId ${k.saticiId})`);
  console.log(`  tarih aralığı    ${istanbulGunu(new Date(bas))} → ${istanbulGunu(new Date(son))}  (${GUN} gün)`);
  console.log(`  API tarafı       sipariş ucu · PAKET döner, sipariş no ile BİRLEŞTİRİLDİ`);
  console.log(`  API taraması     ${DILIM_GUN} günlük ${dilimIstek} dilim · ${tarananGun} günlük DEĞİŞİKLİK penceresi`);
  console.log(`                   ⚠ \`startDate/endDate\` \`orderDate\`i DEĞİL, paketin SON`);
  console.log(`                     DEĞİŞİKLİK anını süzüyor (ölçüldü). Hedef dönem \`orderDate\``);
  console.log(`                     ile İSTEMCİDE süzüldü; ${pencereDisi} kayıt pencere dışı kaldı.`);
  if (dilimHata > 0) {
    console.log(`                   ⛔ ${dilimHata} dilim HATA aldı — API tarafı O KADAR EKSİK.`);
  }
  if (sayfaAsanDilim > 0) {
    console.log(`                   ⛔ ${sayfaAsanDilim} dilimde sayfa tavanı aşıldı.`);
  }
  console.log(`  defter tarafı    \`soldAt\` bu aralıkta · İPTALLER DAHİL (ayrı işaretli)`);
  console.log(`  API okuma anı    ${okumaAni.toISOString()}`);
  console.log(`  ⚠ API tarafı DONMUŞ bir fotoğraf, defter AKIYOR — iki damga da yukarıda.`);
  console.log(`\n  API paket        ${paketler.length}`);
  console.log(`  API sipariş      ${apiHarita.size}   (bölünmüş: ${[...apiHarita.values()].filter((x) => x.paketSayisi > 1).length})`);
  console.log(`  defter satış     ${defterSatislari.length}   (iptalli: ${defterSatislari.filter((s) => s.iptalTarihi).length})`);
  /**
   * ⚠ İNCELENEMEYEN AYRI YAZILIR. Sıfırdan büyükse sonucun KAPSAMI o
   * kadar dardır ve bu ekranda görünmeli — sessizce düşen kayıt,
   * raporu olduğundan geniş gösterir.
   */
  console.log(
    `  eşleştirilemeyen ${kodsuzSatis}   ${kodsuzSatis > 0 ? "⛔ sipariş NUMARASI YOK — hiçbir kovaya giremez" : "(hepsinin sipariş numarası var)"}`,
  );

  // ═══ 4) DÖRT KOVA ═════════════════════════════════════════════════════
  const a: ApiSiparis[] = [];
  const b: string[] = [];
  const c: { no: string; farklar: string[] }[] = [];
  const d: { kod: string; iptalMi: boolean; gun: string }[] = [];

  for (const [no, api] of apiHarita) {
    const def = defterHarita.get(no);
    if (!def) {
      a.push(api);
      continue;
    }
    const farklar: string[] = [];
    if (kurus(api.tutar) !== kurus(def.tutar)) {
      /**
       * ⚠ SAPMA DA YAZILIR — İKİ RAKAM YETMEZ. Sapmalar aynı sayıya
       * yığılıyorsa (ör. hepsi tam ₺15) bu 5 ayrı hata değil TEK BİR
       * MEKANİZMADIR; deltayı yazmayan bir rapor onu göstermez.
       */
      farklar.push(
        `tutar: API ${api.tutar.toFixed(2)} · defter ${def.tutar.toFixed(2)} · sapma ${kurus(def.tutar - api.tutar).toFixed(2)}`,
      );
    }
    if (api.adet !== def.adet) {
      farklar.push(`adet: API ${api.adet} · defter ${def.adet}`);
    }
    if (api.gun !== def.gun) {
      farklar.push(`tarih: API ${api.gun} · defter ${def.gun}`);
    }
    if (api.paketSayisi !== def.paketSayisi) {
      farklar.push(`paketSayisi: API ${api.paketSayisi} · defter ${def.paketSayisi}`);
    }
    /** ⚠ Kargo no defterde BOŞ olabilir — bu bir fark değil, EKSİK giriştir. */
    if (def.kargoNo && api.kargoNolari.length > 0 && !api.kargoNolari.includes(def.kargoNo)) {
      farklar.push(`shipmentCode: API ${api.kargoNolari.join("/")} · defter ${def.kargoNo}`);
    }
    if (farklar.length === 0) b.push(no);
    else c.push({ no, farklar });
  }

  for (const [kod, def] of defterHarita) {
    if (!apiHarita.has(kod)) d.push({ kod, iptalMi: def.iptalMi, gun: def.gun });
  }

  console.log("\n" + cizgi);
  console.log("DÖRT KOVA — tek 'fark' rakamı YOK");
  console.log(cizgi);
  console.log(`\n  (a) API'de VAR, defterde YOK      ${String(a.length).padStart(4)}   ← gerçek boşluk adayı`);
  console.log(`  (b) İKİSİNDE DE VAR, alanlar tutuyor ${String(b.length).padStart(4)}   ← temiz`);
  console.log(`  (c) İKİSİNDE DE VAR, ALAN FARKI   ${String(c.length).padStart(4)}`);
  console.log(`  (d) defterde VAR, API'de YOK      ${String(d.length).padStart(4)}   ⛔ YORUMLANAMAZ`);

  /**
   * ═══ İKİ KOVANIN KANIT DEĞERİ AYNI DEĞİL ═══════════════════════════
   * ⚠ (a) TEK YÖNLÜ KANITTIR: o sipariş API'de GÖRÜLDÜ ve defterde YOK.
   *   API tarafı eksik olsa bile GÖRÜLEN bir kayıt yok sayılamaz.
   * ⚠ (d) KANIT DEĞİLDİR: API tarafının TAM olduğu ölçülemedi (3 günlük
   *   dilim 7 günlükten 26 kayıt fazla buluyor — yakınsama yok). API'de
   *   görünmemek, orada OLMADIĞINI göstermez.
   *
   * İkisi tek "fark" rakamına toplansaydı, en güçlü kanıt en zayıfla aynı
   * ağırlığa inerdi. _(Anayasa: "sıfır üç farklı şey olabilir.")_
   */
  console.log(`\n  ⚠ İKİ KOVANIN KANIT DEĞERİ AYNI DEĞİL:`);
  console.log(`     (a) TEK YÖNLÜ KANIT — o sipariş GÖRÜLDÜ ve defterde yok.`);
  console.log(`         API eksik olsa bile görülen bir kayıt yok sayılamaz.`);
  console.log(`     (d) KANIT DEĞİL — API tarafının TAM olduğu ÖLÇÜLEMEDİ`);
  console.log(`         (3 günlük dilim 7 günlükten 26 kayıt fazla buluyor).`);
  console.log(`         API'de görünmemek, orada OLMADIĞINI göstermez.`);

  if (a.length > 0) {
    console.log(`\n── (a) API'DE VAR, DEFTERDE YOK · ${a.length} sipariş ──`);
    console.log("   sipariş no      tarih        tutar        adet  paket  durum");
    for (const x of a.slice(0, 40)) {
      console.log(
        `   ${x.siparisNo.padEnd(15)} ${x.gun}  ${x.tutar.toFixed(2).padStart(11)}  ${String(x.adet).padStart(4)}  ${String(x.paketSayisi).padStart(5)}  ${[...new Set(x.durumlar)].join("/")}`,
      );
    }
    if (a.length > 40) console.log(`   … ve ${a.length - 40} sipariş daha (listede ilk 40)`);
    const toplam = a.reduce((t, x) => t + x.tutar, 0);
    console.log(`   ── TOPLAM ${a.reduce((t, x) => t + x.adet, 0)} adet · ${toplam.toFixed(2)} TRY`);
  }

  if (c.length > 0) {
    console.log(`\n── (c) ALAN FARKI · ${c.length} sipariş ──`);
    /** ⚠ HANGİ ALAN, ADIYLA — "fark var" demek yeterli değil. */
    const alanSayaci = new Map<string, number>();
    for (const x of c) {
      for (const f of x.farklar) {
        const ad = f.split(":")[0]!;
        alanSayaci.set(ad, (alanSayaci.get(ad) ?? 0) + 1);
      }
    }
    console.log(`   ALAN DAĞILIMI: ${[...alanSayaci].map(([ad, n]) => `${ad}=${n}`).join(" · ")}`);

    /**
     * ⚠ SAPMALAR TEKRARLIYOR MU — TEK MEKANİZMA MI, AYRI HATALAR MI?
     * Aynı sapma değeri yığılıyorsa bu N ayrı vaka değil BİR desendir ve
     * öyle okunmalı. Ayrı ayrı listelenirse okuyan N sorun arar.
     */
    const sapmalar = new Map<string, number>();
    const tarihKaymalari = new Map<string, number>();
    for (const x of c) {
      for (const f of x.farklar) {
        const sap = /sapma (-?[\d.]+)/.exec(f)?.[1];
        if (sap) sapmalar.set(sap, (sapmalar.get(sap) ?? 0) + 1);
        const t = /tarih: API (\S+) · defter (\S+)/.exec(f);
        if (t) {
          const kayma = Math.round(
            (new Date(t[1]!).getTime() - new Date(t[2]!).getTime()) / 86_400_000,
          );
          const ad = `${kayma > 0 ? "+" : ""}${kayma} gün`;
          tarihKaymalari.set(ad, (tarihKaymalari.get(ad) ?? 0) + 1);
        }
      }
    }
    if (sapmalar.size > 0) {
      console.log(
        `   TUTAR SAPMALARI: ${[...sapmalar].map(([v, n]) => `${v} × ${n}`).join(" · ")}`,
      );
      if (sapmalar.size === 1) {
        console.log("     ⚠ TEK DEĞERDE YIĞILDI — bu N ayrı hata değil, BİR MEKANİZMA.");
      }
    }
    if (tarihKaymalari.size > 0) {
      console.log(
        `   TARİH KAYMALARI: ${[...tarihKaymalari].map(([v, n]) => `${v} × ${n}`).join(" · ")}`,
      );
      if (tarihKaymalari.size === 1) {
        console.log("     ⚠ HEPSİ AYNI YÖNDE — sistematik, rastgele değil.");
      }
    }
    for (const x of c.slice(0, 25)) {
      console.log(`   ${x.no}`);
      for (const f of x.farklar) console.log(`       ${f}`);
    }
    if (c.length > 25) console.log(`   … ve ${c.length - 25} sipariş daha`);
  }

  if (d.length > 0) {
    console.log(`\n── (d) DEFTERDE VAR, API'DE YOK · ${d.length} satış ──`);
    console.log("   ⛔ BU KOVA BUGÜN YORUMLANAMAZ. API tarafının tam olduğu");
    console.log("      ölçülemedi; buradaki bir kayıt 'API'de yok' değil,");
    console.log("      'bizim taramamızda görünmedi' demektir.");
    console.log("   ⏭ Yorumlanabilir hâle gelmesi için ENUMERASYON TAMLIĞI");
    console.log("      çözülmeli (bkz. rapor sonu).");
    const iptalli = d.filter((x) => x.iptalMi).length;
    console.log(`   iptalli ${iptalli} · iptalsiz ${d.length - iptalli}`);
    for (const x of d.slice(0, 30)) {
      console.log(`   ${x.kod.padEnd(15)} ${x.gun}  ${x.iptalMi ? "İPTAL" : ""}`);
    }
    if (d.length > 30) console.log(`   … ve ${d.length - 30} satış daha`);
  }

  console.log("\n" + cizgi);
  console.log("  SALT OKUMA — veritabanına hiçbir şey yazılmadı, hiçbir yazma ucu çağrılmadı.");
  console.log("  ⚠ HÜKÜM VERİLMEDİ: (a) kovası bir BOŞLUK ADAYIDIR; içe aktarmanın");
  console.log("    kuru koşumu bu listeden doğar ve yazma ancak onaydan sonra.");
  console.log(cizgi + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("MUTABAKAT DÜŞTÜ:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
