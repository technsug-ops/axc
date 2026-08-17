/**
 * ============================================================================
 *  BAĞSIZ HAKEDİŞ KALEMLERİNİ EŞLEŞTİR — TEKRARLANABİLİR TAZELEME
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:hakedis-esle             → YALNIZ RAPOR, hiçbir şey yazmaz
 *      npm run canli:hakedis-esle -- --uygula → bağları yazar
 *
 *  ⚠ NİYE VAR — YAPISAL KÖR NOKTA, tarihsel kaza değil.
 *
 *  Bağ YALNIZ yükleme anında kuruluyor (`satirlariEslestir`). Rapor,
 *  satışlar sisteme girilmeden yüklenirse o an karşılık bulunmaz ve kalem
 *  SONSUZA DEK bağsız kalır. 18.08.2026 ölçümü: 651 kalemin 0'ı bağlı —
 *  üçüncü kez sıfır (13.08: 651/0 · 15.08: 110/0).
 *
 *  Bu sıra bir daha ters dönebilir: Trendyol raporu haftalık geliyor,
 *  satışlar elle giriliyor. Bu yüzden araç TEK SEFERLİK DEĞİL,
 *  TEKRARLANABİLİR: her koşuda yalnız o an bağsız olanlara bakar,
 *  bağlıya dokunmaz, iki kez koşmak bir kez koşmakla aynı sonucu verir.
 *
 *  ── NE YAPAR, NE YAPMAZ ─────────────────────────────────────────────────
 *  YAPAR : `saleId` BOŞ olan kaleme, sipariş kodu BİREBİR tutan satışı bağlar.
 *  YAPMAZ: tutar, vade, kâr, stok — hiçbirine dokunmaz. Yalnız bağ yazılır.
 *          Bağlı bir kalemi ASLA yeniden bağlamaz ya da koparmaz.
 *
 *  Bağ, satışın rakamlarını DEĞİŞTİRMEZ; yalnız karşılaştırmayı MÜMKÜN
 *  kılar. Kayıt kalitesizse zaten eşleşmez; eşleşip tutmuyorsa ekranda
 *  "EKSİK/FAZLA ÖDEME" olarak görünür — bu BİLGİDİR, bozulma değil.
 *
 *  ── AYNI KURAL, YÜKLEME YOLUYLA ─────────────────────────────────────────
 *  Eşleşme ölçütü yükleme yolundakiyle AYNI tutuldu: sipariş kodu birebir
 *  + satış İPTALLİ DEĞİL. İptalli satış eşleşseydi kanalın ödemeyeceği bir
 *  tutar "bekleyen hakediş" olarak görünür ve nakit beklentisi şişerdi.
 *
 *  ── TEK YENİ KONTROL: KANAL ─────────────────────────────────────────────
 *  Yükleme yolu kanal kontrolü yapmaz ve YAPMASINA GEREK YOKTUR: tek bir
 *  kanalın raporu yüklenir, kodlar zaten o kanaldandır. TOPLU tazelemede
 *  ise bütün kanallar aynı anda taranır ve çapraz eşleşme ilk kez MÜMKÜN
 *  hâle gelir. Bu ayrı bir kural değil, aynı niyetin yeni bağlamda açıkça
 *  yazılmış hâlidir: kanalı tutmayan satır BAĞLANMAZ, listelenir.
 *
 *  ── ÇİFT EŞLEŞME REDDEDİLİR ─────────────────────────────────────────────
 *  Aynı sipariş kodu birden çok satışa düşüyorsa hangisi olduğu BİLİNMEZ.
 *  Tahmin edip bağlamak, yanlış satışa para yazmaktır — satır bağlanmaz ve
 *  elle karara bırakılır.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import {
  eslemeOzeti,
  yenidenEsle,
  type RetSebebi,
} from "../src/lib/hakedis/yeniden-esle";
import { canliYapilandirma } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");

function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("");
  console.log("BAĞSIZ HAKEDİŞ KALEMLERİNİ EŞLEŞTİR");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  kip        ${UYGULA ? "UYGULA (bağ yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  /** YALNIZ BAĞSIZ OLANLAR — bağlıya dokunulmaz (tekrarlanabilirlik). */
  const bagsizlar = await prisma.settlementItem.findMany({
    where: { saleId: null, orderNo: { not: null } },
    select: {
      id: true,
      orderNo: true,
      amount: true,
      channelAccountId: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
    },
  });

  console.log(`  bağsız kalem (sipariş nolu): ${bagsizlar.length}`);
  if (bagsizlar.length === 0) {
    console.log("  Bağlanacak kalem yok.");
    await prisma.$disconnect();
    return;
  }

  const nolar = [
    ...new Set(
      bagsizlar
        .map((k) => (k.orderNo ?? "").trim())
        .filter((d) => d !== ""),
    ),
  ];

  /**
   * ADAY SATIŞLAR — iptalliler DIŞARIDA (yükleme yolundaki kuralın aynısı).
   */
  const adaylar = await prisma.sale.findMany({
    where: { code: { in: nolar }, iptalTarihi: null },
    select: { id: true, code: true, channelAccountId: true },
  });

  /**
   * KARAR SAF FONKSİYONDAN — kural `lib/hakedis/yeniden-esle.ts`te.
   * Betik yalnız veriyi taşır; mantığı burada tekrarlasaydı eşleşme
   * sistemde iki yerde yaşardı.
   */
  const kararlar = yenidenEsle(
    bagsizlar
      .filter((k) => (k.orderNo ?? "").trim() !== "")
      .map((k) => ({
        id: k.id,
        siparisNo: (k.orderNo ?? "").trim(),
        channelAccountId: k.channelAccountId,
      })),
    adaylar.map((s) => ({
      id: s.id,
      kod: (s.code ?? "").trim(),
      channelAccountId: s.channelAccountId,
    })),
  );
  const ozet = eslemeOzeti(kararlar);

  const baglanacak = kararlar.filter((k) => k.olur);
  const kalemKanali = new Map(
    bagsizlar.map((k) => [
      k.id,
      `${k.channelAccount.channel.name} — ${k.channelAccount.name}`,
    ]),
  );
  const redler = (sebep: RetSebebi) =>
    kararlar.filter((k) => !k.olur && k.sebep === sebep);

  console.log("");
  console.log("  ── SONUÇ ───────────────────────────────────────────────────");
  console.log(`     BAĞLANACAK                   ${ozet.baglanacak}`);
  console.log(`     karşılığı yok                ${ozet.karsiligiYok}`);
  console.log(`     çift eşleşme (REDDEDİLDİ)    ${ozet.ciftEslesme}`);
  console.log(`     kanal uyuşmuyor (REDDEDİLDİ) ${ozet.kanalUyusmaz}`);
  console.log("");

  if (baglanacak.length > 0) {
    const ornek = baglanacak.slice(0, 5).map((b) => b.kod);
    console.log(`     örnek bağlanacak sipariş: ${ornek.join(" · ")}`);
    console.log("");
  }
  if (ozet.ciftEslesme > 0) {
    console.log("     ⚠ ÇİFT EŞLEŞME — elle karara bırakıldı:");
    for (const k of redler("CIFT_ESLESME").slice(0, 10)) {
      console.log(`        ${k.kod}`);
    }
    console.log("");
  }
  if (ozet.kanalUyusmaz > 0) {
    console.log("     ⚠ KANAL UYUŞMUYOR — kod tutuyor ama hesap başka:");
    for (const k of redler("KANAL_UYUSMUYOR").slice(0, 10)) {
      console.log(`        ${doldur(k.kod, 16)} kalem: ${kalemKanali.get(k.kalemId) ?? "?"}`);
    }
    console.log("");
  }

  /**
   * TEŞHİS — A/B ayrımı burada da yazılır ki betik tek başına da konuşsun.
   */
  if (ozet.baglanacak === 0) {
    console.log("     → TEŞHİS B: bağlanacak kalem YOK.");
    console.log("       Raporun sipariş numaralarının sistemde karşılığı");
    console.log("       yok. Taze rapor da bu hâliyle SIFIR verir; önce");
    console.log("       numara biçimi ya da eksik satış girişi çözülmeli.");
    const yoklar = redler("KARSILIK_YOK").map((k) => k.kod);
    if (yoklar.length > 0) {
      console.log(`       örnek karşılıksız no: ${[...new Set(yoklar)].slice(0, 3).join(" · ")}`);
    }

    /**
     * ── B'NİN İKİ ALT SEBEBİ — AYRILMADAN İŞ AÇILMAZ ──────────────────
     *
     * B1) BİÇİM FARKI — numaralar aynı siparişi gösteriyor ama yazımları
     *     tutmuyor (önek, tire, ön sıfır). ÇÖZÜM: normalleştirme kuralı.
     * B2) YOKLUK — o siparişler sisteme hiç girilmemiş. ÇÖZÜM eşleştirme
     *     DEĞİL; teyit, satışları sistemde OLAN bir dönemle yapılmalı.
     *
     * Ayrım kritik: B1 sanıp normalleştirme yazmak, B2'de hiçbir şeyi
     * çözmez ve bir sabahı daha yakar.
     *
     * Ölçüt: kodların ŞEKLİ (uzunluk + rakam mı) ve TARİH ARALIKLARI.
     * Şekil aynı ama numaralar farklıysa sebep yokluktur.
     */
    const ornekSatislar = await prisma.sale.findMany({
      where: { code: { not: null } },
      select: { code: true, soldAt: true },
      orderBy: { soldAt: "asc" },
    });

    const sekil = (d: string) =>
      `${d.length} hane · ${/^\d+$/.test(d) ? "yalnız rakam" : "rakam dışı karakter VAR"}`;

    const rapordanOrnek = [...new Set(redler("KARSILIK_YOK").map((k) => k.kod))];
    const satistanOrnek = ornekSatislar
      .map((s) => (s.code ?? "").trim())
      .filter((d) => d !== "");

    console.log("");
    console.log("     ── B1 (biçim) mi B2 (yokluk) mu ──");
    if (rapordanOrnek.length > 0) {
      console.log(`       rapor   ${rapordanOrnek[0]}   → ${sekil(rapordanOrnek[0])}`);
    }
    if (satistanOrnek.length > 0) {
      console.log(`       satış   ${satistanOrnek[0]}   → ${sekil(satistanOrnek[0])}`);
    }

    const sekilAyni =
      rapordanOrnek.length > 0 &&
      satistanOrnek.length > 0 &&
      sekil(rapordanOrnek[0]) === sekil(satistanOrnek[0]);

    /** TARİH ARALIKLARI — kesişmiyorsa yokluk kanıtlanır. */
    const partiler = await prisma.settlement.findMany({
      select: { periodStart: true, periodEnd: true },
    });
    const tarihler = partiler
      .flatMap((p) => [p.periodStart, p.periodEnd])
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const gun = (d: Date | undefined) =>
      d ? d.toISOString().slice(0, 10) : "—";

    console.log("");
    console.log(`       rapor dönemi   ${gun(tarihler[0])} → ${gun(tarihler[tarihler.length - 1])}`);
    console.log(
      `       satış aralığı  ${gun(ornekSatislar[0]?.soldAt)} → ${gun(ornekSatislar[ornekSatislar.length - 1]?.soldAt)}`,
    );
    console.log(`       sistemdeki satış sayısı: ${ornekSatislar.length}`);
    console.log("");

    if (sekilAyni) {
      console.log("       → B2 (YOKLUK). Kodların ŞEKLİ aynı; numaralar");
      console.log("         farklı, yani biçim sorunu YOK. O dönemin satışları");
      console.log("         sisteme girilmemiş.");
      console.log("         YAPILACAK: normalleştirme YAZMA — boşa iş olur.");
      console.log("         Teyit, satışları sistemde OLAN bir dönemin");
      console.log("         raporuyla yapılmalı.");
      console.log("");

    /**
     * ── HANGİ HESAPTA — SABAHIN ASIL SORUSU ───────────────────────────
     *
     * 18.08.2026 ölçümü: 34 satış, 648 kalem, kesişim SIFIR. "Dönem
     * farkı" tek başına bunu açıklamaz; kanal hesabı da bakılmalı.
     *
     * Raporlar bir hesaba, satışlar başka hesaba düşüyorsa taze rapor da
     * BOŞ çıkar — dönemi değil HESABI değiştirmek gerekir. Bu ayrım
     * yapılmadan "yarın taze dosya yükle" demek, dördüncü sıfır demektir.
     */
    const kalemHesaplari = await prisma.settlementItem.groupBy({
      by: ["channelAccountId"],
      _count: { _all: true },
    });
    const satisHesaplari = await prisma.sale.groupBy({
      by: ["channelAccountId"],
      _count: { _all: true },
    });
    const hesapAdlari = new Map(
      (
        await prisma.channelAccount.findMany({
          select: { id: true, name: true, channel: { select: { name: true } } },
        })
      ).map((h) => [h.id, `${h.channel.name} — ${h.name}`]),
    );

    console.log("     ── HANGİ HESAPTA ──");
    console.log("       RAPOR KALEMLERİ:");
    for (const g of kalemHesaplari) {
      console.log(
        `         ${doldur(hesapAdlari.get(g.channelAccountId) ?? "?", 32)} ${g._count._all}`,
      );
    }
    console.log("       SATIŞLAR:");
    for (const g of satisHesaplari) {
      console.log(
        `         ${doldur(hesapAdlari.get(g.channelAccountId) ?? "?", 32)} ${g._count._all}`,
      );
    }

    const kalemHesapKumesi = new Set(kalemHesaplari.map((g) => g.channelAccountId));
    const ortak = satisHesaplari.filter((g) => kalemHesapKumesi.has(g.channelAccountId));
    console.log("");
    if (ortak.length === 0) {
      console.log("       ⚠ ORTAK HESAP YOK. Raporlar bir hesaba, satışlar");
      console.log("         BAŞKA hesaba düşüyor. Taze rapor da bu hâliyle boş");
      console.log("         çıkar — değiştirilmesi gereken DÖNEM değil HESAP.");
      console.log("         Yüklenecek rapor, satışların bulunduğu hesabın");
      console.log("         raporu olmalı.");
    } else {
      console.log(
        `       ✓ ORTAK HESAP VAR: ${ortak.map((g) => hesapAdlari.get(g.channelAccountId)).join(" · ")}`,
      );
      console.log("         O hesabın GÜNCEL dönem raporu yüklenirse bağ kurulur.");
    }

    /**
     * DÖNEM DAMGASI BOŞ — ayrı bulgu. `Settlement.periodStart/periodEnd`
     * şemada var ama HİÇBİR YERDE yazılmıyor (ölçüldü 18.08.2026). Bu
     * yüzden "bu rapor hangi dönemi kapsıyor" sorusu sistemden
     * cevaplanamıyor; yukarıdaki tarih satırı bu yüzden boş çıktı.
     */
    const damgasiz = partiler.filter(
      (p) => p.periodStart === null && p.periodEnd === null,
    ).length;
    if (damgasiz > 0) {
      console.log("");
      console.log(`       ⚠ ${damgasiz}/${partiler.length} rapor partisinde DÖNEM DAMGASI YOK.`);
      console.log("         periodStart/periodEnd şemada var, hiçbir yerde");
      console.log("         yazılmıyor. 'Bu rapor hangi dönemi kapsıyor'");
      console.log("         sorusu sistemden cevaplanamıyor.");
    }
    } else {
      console.log("       → B1 (BİÇİM). Kodların şekli TUTMUYOR — yukarıdaki");
      console.log("         iki örneği karşılaştır. Normalleştirme kuralı");
      console.log("         gerekiyor; taze rapor tek başına çözmez.");
    }

  } else {
    console.log("     → TEŞHİS A: ZAMANLAMA doğrulandı; bağ kurulabilir.");
  }
  console.log("");

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar beklenene uyuyorsa:  npm run canli:hakedis-esle -- --uygula");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  /**
   * YAZMA — koşullu güncelleme. `saleId: null` şartı WHERE'de DE durur:
   * betik çalışırken başka bir yükleme aynı kalemi bağlamış olabilir;
   * o bağı ezmek, kurulmuş doğru bir bağı sessizce değiştirmek olurdu.
   */
  let yazilan = 0;
  for (const b of baglanacak) {
    if (!b.olur) continue;
    const sonuc = await prisma.settlementItem.updateMany({
      where: { id: b.kalemId, saleId: null },
      data: { saleId: b.saleId },
    });
    yazilan += sonuc.count;
  }

  console.log(`  ✓ ${yazilan} kalem bağlandı.`);
  if (yazilan !== ozet.baglanacak) {
    console.log(
      `  (${ozet.baglanacak - yazilan} kalem arada başkası tarafından bağlanmış — dokunulmadı)`,
    );
  }
  console.log("");
  console.log("  Sonraki adım: npm run canli:hakedis-teyit");
  console.log("");

  await prisma.$disconnect();
}

main();
