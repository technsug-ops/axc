/**
 * ============================================================================
 *  MELONTİK ÇAPRAZ TEYİT — AŞAMA 0, ZEMİN
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:melontik-teyit
 *      npm run canli:melontik-teyit -- 11506136293=1234.56 11505178853=789.10
 *
 *  HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da yoktur.
 *
 *  ⚠ NİYE VAR — "MELONTİK'E YETİŞ VE GEÇ" haritasının SIFIRINCI adımı.
 *
 *  Sistem her gün NET-2 üretiyor ve kararlar ona dayanıyor. Ama bu rakam
 *  bugüne kadar **kendi kendini doğruladı**: kâr motoru hesaplıyor, ekran
 *  gösteriyor, test motoru sınıyor — üçü de aynı kaynaktan besleniyor.
 *  BAĞIMSIZ bir doğrulama hiç yapılmadı.
 *
 *  Melontik'in sunumu o bağımsız kaynaktır: aynı altı sipariş, başka bir
 *  sistemin kâr hesabı. Rakamlar tutarsa NET-2'nin altı sağlamdır ve
 *  üstüne fiyatlama zekâsı kurulabilir. Tutmazsa, üstüne kurulacak her
 *  şey yanlış zemine oturur.
 *
 *  ⚠⚠ REFERANSIN GERÇEK OLDUĞU VARSAYILMAZ — 18.08.2026 KULLANICI UYARISI.
 *
 *  İlk koşuda sunumdaki rakamlarla karşılaştırma yapıldı ve iki siparişte
 *  fark çıktı. Kullanıcı sonra söyledi: **"sunumdakiler sadece demo."**
 *  Yani o rakamlar Melontik'in bu siparişler için ürettiği gerçek çıktı
 *  DEĞİLDİ ve çıkan fark bir BULGU değildi.
 *
 *  DERS — ÖLÇÜT DE KAYNAĞIYLA ANILIR. Karşılaştırmanın değeri, ölçülen
 *  tarafa değil ÖLÇÜTE bağlıdır. Ölçüt doğrulanmadan çıkan fark, teşhis
 *  değil gürültüdür; üstelik peşinden gerçek bir motoru "düzeltme"
 *  girişimi başlatır ve doğru olanı bozabilirdi.
 *
 *  Bu yüzden betik artık referansın KAYNAĞINI ve GÜVENİLİRLİĞİNİ ekrana
 *  basar; `_UYARI` alanı doluysa hükmü "teyit edildi" diye vermez.
 *
 *  ── MELONTİK RAKAMLARI DEPOYA GİRMEZ ────────────────────────────────────
 *  Rakamlar sunumun 28. slaytında ("Sipariş Kârlılık Analizi — Ekrandaki
 *  örnekler") yazılı ve `veri/ozel/melontik-referans.json` dosyasına
 *  alındı. O klasör **gitignore'da**: depo herkese açık ve sipariş bazında
 *  kâr TİCARİ VERİDİR. Gerçek hakediş dosyalarında verilen kararın aynısı.
 *
 *  Dosya yoksa betik durmaz: rakamlar komut satırından da verilebilir
 *
 *      npm run canli:melontik-teyit -- 11506136293=1234.56
 *
 *  İkisi de yoksa kendi tarafımız tam basılır, Melontik sütunu "—" kalır
 *  ve karşılaştırma YAPILMAZ. **Uydurma rakamla yeşil yanmaz.**
 *
 *  ── HANGİ NET İLE KARŞILAŞTIRILIR: NET-2 ────────────────────────────────
 *  Melontik'in masraf kalemleri (sunum slayt 4) stopaj VE net KDV içeriyor.
 *  Bizim NET-1 yalnız stopajı düşer; KDV'yi de düşen NET-2'dir. Yani
 *  karşılığı NET-2'dir — NET-1 ile karşılaştırmak sistematik bir fark
 *  üretir ve sahte bir "uyuşmazlık" doğururdu.
 *
 *  ── NET-2 TEK BAŞINA KARŞILAŞTIRILMAZ ───────────────────────────────────
 *  İki sistem aynı NET'i farklı yollardan bulabilir ya da farklı NET'i
 *  aynı yoldan. Bu yüzden döküm de basılır: ciro · komisyon · kargo ·
 *  stopaj · KDV · maliyet. Fark çıkarsa HANGİ kalemde çıktığı görünür,
 *  yoksa "tutmuyor" deyip kalınır ve teşhis yapılamaz.
 * ============================================================================
 */

import { readFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** Karşılaştırma eşiği — kuruş farkı gürültüdür (hakediş ile aynı ilke). */
const FARK_ESIGI = 1;

const SIPARISLER = [
  "11506136293",
  "11505178853",
  "11504867891",
  "11504122276",
  "11501857051",
  "11500304529",
];

/**
 * Melontik kârları: önce `veri/ozel/melontik-referans.json`, sonra komut
 * satırı. Komut satırı EZER — elde daha taze bir ekran varsa dosyayı
 * güncellemeden deneyebilmek için.
 */
function melontikRakamlari(): Map<string, number> {
  const harita = new Map<string, number>();

  try {
    const ham = readFileSync("veri/ozel/melontik-referans.json", "utf8");
    const veri = JSON.parse(ham) as {
      siparisler?: Record<string, { kar?: number }>;
    };
    for (const [kod, d] of Object.entries(veri.siparisler ?? {})) {
      if (typeof d.kar === "number") harita.set(kod, d.kar);
    }
  } catch {
    // Dosya yoksa sorun değil — komut satırı ya da "karşılaştırma yok".
  }

  for (const arg of process.argv.slice(2)) {
    const [kod, deger] = arg.split("=");
    if (!kod || !deger) continue;
    const sayi = Number(deger.replace(",", "."));
    if (Number.isFinite(sayi)) harita.set(kod.trim(), sayi);
  }
  return harita;
}

/** Sunumdaki "Sipariş tutarı" — ciro karşılaştırması için. */
function melontikTutarlari(): Map<string, number> {
  const harita = new Map<string, number>();
  try {
    const veri = JSON.parse(
      readFileSync("veri/ozel/melontik-referans.json", "utf8"),
    ) as { siparisler?: Record<string, { tutar?: number }> };
    for (const [kod, d] of Object.entries(veri.siparisler ?? {})) {
      if (typeof d.tutar === "number") harita.set(kod, d.tutar);
    }
  } catch {
    // referans yoksa ciro karşılaştırması da yapılmaz
  }
  return harita;
}

/** Sunumdaki "Kâr oranı" (kâr ÷ ürün maliyeti) — maliyet türetmek için. */
function melontikOranlar(): Map<string, number> {
  const harita = new Map<string, number>();
  try {
    const veri = JSON.parse(
      readFileSync("veri/ozel/melontik-referans.json", "utf8"),
    ) as { siparisler?: Record<string, { karOrani?: number }> };
    for (const [kod, d] of Object.entries(veri.siparisler ?? {})) {
      if (typeof d.karOrani === "number") harita.set(kod, d.karOrani);
    }
  } catch {
    // referans yoksa ayrıştırma yapılmaz
  }
  return harita;
}

/**
 * Referans dosyasındaki `_UYARI` alanı. Doluysa rakamlar ÖLÇÜT DEĞİLDİR
 * ve hüküm "teyit edildi" olamaz — en fazla "şu an şöyle görünüyor".
 */
function referansGuvenilirMi(): string | null {
  try {
    const veri = JSON.parse(
      readFileSync("veri/ozel/melontik-referans.json", "utf8"),
    ) as { _UYARI?: string };
    return typeof veri._UYARI === "string" && veri._UYARI.trim() !== ""
      ? veri._UYARI
      : null;
  } catch {
    return null;
  }
}

function para(d: number | null): string {
  if (d === null) return "—";
  return d.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

  const melontik = melontikRakamlari();
  const referansUyarisi = referansGuvenilirMi();
  const melontikCirolari = melontikTutarlari();
  const melontikOranlari = melontikOranlar();

  console.log("");
  console.log("MELONTİK ÇAPRAZ TEYİT — AŞAMA 0");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log(
    `  Melontik   ${melontik.size > 0 ? `${melontik.size} sipariş için referans var` : "referans YOK (yalnız bizim taraf basılır)"}`,
  );
  if (referansUyarisi !== null) {
    console.log("");
    console.log("  ╔══════════════════════════════════════════════════════════╗");
    console.log("  ║  ⚠ REFERANS GÜVENİLİR DEĞİL — KARŞILAŞTIRMA BAĞLAYICI   ║");
    console.log("  ║    DEĞİLDİR. Çıkan fark BULGU SAYILMAZ.                  ║");
    console.log("  ╚══════════════════════════════════════════════════════════╝");
    console.log(`  ${referansUyarisi}`);
  }
  console.log("");

  const satislar = await prisma.sale.findMany({
    where: { code: { in: SIPARISLER } },
    select: {
      code: true,
      soldAt: true,
      iptalTarihi: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
      profitCurrency: true,
      cargoAmount: true,
      cargoDesi: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
      items: {
        select: {
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { product: { select: { name: true } } } },
        },
      },
      fees: { select: { code: true, amount: true } },
    },
  });

  const bulunan = new Map(satislar.map((s) => [s.code ?? "", s]));

  // --- 1) VAR MI ------------------------------------------------------------
  console.log("  ── 1) SİPARİŞLER SİSTEMDE VAR MI ──────────────────────────");
  const eksikler: string[] = [];
  for (const kod of SIPARISLER) {
    const s = bulunan.get(kod);
    if (!s) {
      eksikler.push(kod);
      console.log(`     ${doldur(kod, 16)} YOK`);
    } else {
      console.log(
        `     ${doldur(kod, 16)} var · ${s.soldAt.toISOString().slice(0, 10)} · ${s.channelAccount.channel.name} — ${s.channelAccount.name}${s.iptalTarihi ? "  ⚠ İPTALLİ" : ""}`,
      );
    }
  }
  console.log("");
  console.log(`     bulunan ${SIPARISLER.length - eksikler.length}/${SIPARISLER.length}`);
  if (eksikler.length > 0) {
    console.log("");
    console.log("     ⚠ EKSİK SİPARİŞLER TEYİDİ DARALTIR, DÜŞÜRMEZ.");
    console.log("       Bulunanlarla karşılaştırma yine anlamlıdır; ama");
    console.log("       örneklem küçüldüğü için 'NET-2 sağlam' hükmü o kadar");
    console.log("       az siparişe dayanır. Kaç sipariş üstünde konuştuğumuz");
    console.log("       raporda yazılı olsun.");
  }
  console.log("");

  // --- 2) DÖKÜM + KARŞILAŞTIRMA --------------------------------------------
  console.log("  ── 2) KÂR DÖKÜMÜ ──────────────────────────────────────────");
  console.log(`     eşik: ±${FARK_ESIGI} — altı "tutuyor" sayılır (kuruş farkı gürültüdür)`);
  console.log("");

  let tutan = 0;
  let tutmayan = 0;
  let karsilastirilmayan = 0;

  for (const kod of SIPARISLER) {
    const s = bulunan.get(kod);
    if (!s) continue;

    /**
     * ⚠ KESİNTİLER SABİT LİSTEDEN DEĞİL, KAYITTAN OKUNUR (düzeltme).
     *
     * İlk hâlde beş kod elle yazılmıştı (MALIYET, KOMISYON, KARGO, STOPAJ,
     * ODENECEK_KDV). İki hata birden vardı:
     *   · `ODENECEK_KDV` diye bir kesinti YOK — o rakam hiçbir yere
     *     yazılmıyor, yalnız NET-1 ile NET-2 arasındaki fark olarak var.
     *     Döküm "0,00" basıp kendi NET-2'sini açıklayamıyordu.
     *   · Listede olmayan bir kesinti (ör. TAHSILAT_BEDELI) kayıtta olsa
     *     GÖRÜNMEZDİ — tam da aradığımız "eksik kalem" bu yolla saklanırdı.
     *
     * Şimdi ne varsa o basılıyor. Aradığımız şey bilinmeyen bir kalemse,
     * onu bilinen kodlarla arayamayız.
     */
    const kesintiler = new Map<string, number>();
    for (const f of s.fees) {
      kesintiler.set(
        f.code,
        (kesintiler.get(f.code) ?? 0) + Number(f.amount.toString()),
      );
    }

    const ciro = s.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    );
    const net1 = s.net1Amount === null ? null : Number(s.net1Amount.toString());
    const net2 = s.net2Amount === null ? null : Number(s.net2Amount.toString());
    const bizim = melontik.get(kod);

    console.log(`     ${kod}  ${s.items[0]?.variant.product.name.slice(0, 44) ?? ""}`);

    /**
     * CİRO DA KARŞILAŞTIRILIR. Kâr tutmuyorsa ilk soru "aynı satıştan mı
     * bahsediyoruz" olmalı; ciro tutmuyorsa fark kâr motorunda değil
     * kaydın kendisindedir.
     */
    const melontikCiro = melontikCirolari.get(kod);
    if (melontikCiro !== undefined) {
      const ciroFarki = ciro - melontikCiro;
      console.log(
        `        ciro          ${para(ciro)}   Melontik ${para(melontikCiro)}   ${Math.abs(ciroFarki) <= FARK_ESIGI ? "✓" : `✗ fark ${para(ciroFarki)}`}`,
      );
    } else {
      console.log(`        ciro          ${para(ciro)}`);
    }

    for (const [ad, tutar] of [...kesintiler.entries()].sort()) {
      console.log(`        ${doldur(ad.toLowerCase(), 13)} ${para(tutar)}`);
    }
    console.log(`        NET-1         ${para(net1)}`);
    /** ÖDENECEK KDV TÜRETİLİR — kesinti satırı yok, fark olarak yaşıyor. */
    if (net1 !== null && net2 !== null) {
      console.log(`        ödenecek KDV  ${para(net1 - net2)}   (türetildi: NET-1 − NET-2)`);
    }
    console.log(`        NET-2         ${para(net2)}   ← bizim hükmümüz`);

    if (s.profitStatus !== null && s.profitStatus !== "CALCULATED") {
      console.log(`        ⚠ kâr durumu: ${s.profitStatus}`);
    }

    if (bizim === undefined) {
      console.log(`        Melontik      —   (referans yok)`);
      karsilastirilmayan++;
    } else if (net2 === null) {
      console.log(`        Melontik      ${para(bizim)}`);
      console.log(`        ⚠ bizim NET-2 HESAPLANAMAMIŞ — karşılaştırma yapılmadı`);
      karsilastirilmayan++;
    } else {
      const fark = net2 - bizim;
      const uyuyor = Math.abs(fark) <= FARK_ESIGI;
      if (uyuyor) tutan++;
      else tutmayan++;
      console.log(`        Melontik      ${para(bizim)}`);
      console.log(
        `        FARK          ${para(fark)}   ${uyuyor ? "✓ tutuyor" : "✗ UYUŞMUYOR"}`,
      );

      /**
       * ── FARKI İKİYE AYIR — mimar talebi 18.08.2026 ────────────────────
       *
       * Toplam fark tek başına teşhis ettirmez: maliyet tabanı mı farklı,
       * yoksa masraf kalemi mi eksik? İkisi ZIT işaretli olabilir ve
       * birbirini gizler — nitekim iki siparişte işaretler zıt çıktı.
       *
       * Melontik maliyeti sunumda YAZMIYOR ama TÜRETİLEBİLİR:
       *     kâr oranı = kâr ÷ ürün maliyeti  →  maliyet = kâr ÷ oran
       *
       * ⚠ TÜRETME KESİN DEĞİL: oran sunumda iki ondalıkla yuvarlı, bu da
       * maliyet tahmininde ±1 TL'ye kadar belirsizlik bırakır. Bu yüzden
       * sonuç "eşit" değil "eşik içinde" diye okunur.
       *
       * DENKLEM KAPANMALI:  maliyet farkı + masraf farkı = toplam fark
       */
      const oran = melontikOranlari.get(kod);
      const bizimMaliyet = kesintiler.get("MALIYET") ?? 0;
      if (oran !== undefined && oran > 0) {
        const melontikMaliyet = bizim / (oran / 100);
        /** Bizim maliyetimiz FAZLAYSA kârımız o kadar DÜŞER → eksi katkı. */
        const maliyetKatkisi = -(bizimMaliyet - melontikMaliyet);
        const masrafKatkisi = fark - maliyetKatkisi;
        console.log("");
        console.log(`        ── farkın ayrışması ──`);
        console.log(`        maliyet  biz ${para(bizimMaliyet)}  Melontik ~${para(melontikMaliyet)}  → katkı ${para(maliyetKatkisi)}`);
        console.log(`        masraf   (kalan)                              → katkı ${para(masrafKatkisi)}`);
        console.log(`        toplam                                        = ${para(maliyetKatkisi + masrafKatkisi)}  (fark ${para(fark)})`);
        const oranPay = ciro > 0 ? (masrafKatkisi / ciro) * 100 : 0;
        console.log(`        masraf katkısı cironun %${oranPay.toFixed(3)}'ü`);
        if (masrafKatkisi > FARK_ESIGI) {
          console.log(`        → BİZ DAHA AZ MASRAF DÜŞÜYORUZ: Melontik'te olup`);
          console.log(`          bizde olmayan bir kalem olabilir (tahsilat/ödeme`);
          console.log(`          bedeli gibi). Yukarıdaki kesinti dökümüne bak.`);
        } else if (masrafKatkisi < -FARK_ESIGI) {
          console.log(`        → BİZ DAHA ÇOK MASRAF DÜŞÜYORUZ.`);
        }
      } else {
        console.log(`        (kâr oranı yok — fark ayrıştırılamadı)`);
      }
    }
    console.log("");
  }

  // --- 3) HÜKÜM -------------------------------------------------------------
  console.log("  ── 3) HÜKÜM ───────────────────────────────────────────────");
  if (melontik.size === 0) {
    console.log("     Melontik rakamı verilmedi — çapraz teyit YAPILMADI.");
    console.log("     Yukarıdaki döküm bizim tarafımızdır; sunumdaki kârları");
    console.log("     şu biçimde geçince fark otomatik hesaplanır:");
    console.log("       npm run canli:melontik-teyit -- 11506136293=1234.56 ...");
  } else {
    console.log(`     tutuyor        ${tutan}`);
    console.log(`     UYUŞMUYOR      ${tutmayan}`);
    console.log(`     karşılaştırılamadı ${karsilastirilmayan}`);
    console.log("");
    if (referansUyarisi !== null) {
      console.log("     ⚠ HÜKÜM VERİLEMEZ — referans güvenilir değil.");
      console.log("       Yukarıdaki tutan/uyuşmayan sayıları YALNIZ ölçüt");
      console.log("       gerçek olsaydı anlam taşırdı. Bu hâliyle ne");
      console.log("       'doğrulandı' ne 'fark var' denebilir.");
      console.log("");
      console.log("       GEREKEN: Melontik'in canlı 'Sipariş Kârlılık");
      console.log("       Analizi' ekranından GERÇEK rakamlar alınıp");
      console.log("       veri/ozel/melontik-referans.json değiştirilmeli");
      console.log("       (ve _UYARI alanı silinmeli).");
    } else if (tutmayan === 0 && tutan > 0) {
      console.log(`     ✓ NET-2 BAĞIMSIZ DOĞRULANDI (${tutan} sipariş üstünde).`);
      console.log("       Aşama 1'in zemini sağlam.");
    } else if (tutmayan > 0) {
      console.log("     ✗ FARK VAR — Aşama 1 AÇILMAZ.");
      console.log("       Yukarıdaki dökümde farkın HANGİ kalemde doğduğuna bak");
      console.log("       (komisyon mu, kargo mu, stopaj mı). Kök teşhis");
      console.log("       edilmeden fiyatlama zekâsı yanlış zemine oturur.");
    }
  }
  console.log("");


  // --- 4) ÖDEME HİZMETİ HİPOTEZİ — VERİDEN ---------------------------------
  /**
   * ⚠ Mimar hipotezi 18.08.2026: "Melontik'in düştüğü, bizim düşmediğimiz
   * bir kalem var — sunum slayt 4'teki 'Ödeme Hizmeti'."
   *
   * Hipotez TAHMİNLE değil VERİYLE sınanır, iki soruda:
   *   1. Kanal bize böyle bir kesinti KESİYOR mu? → hakediş kalemlerinde
   *      `TAHSILAT_BEDELI` / `HIZMET_BEDELI` satırı var mı, kaç TL.
   *   2. Kâr motorumuz onu DÜŞÜYOR mu? → kanal kesinti kurallarında
   *      (`ChannelFee`) karşılığı tanımlı mı.
   *
   * İkisi ayrı sorudur: kanal kesiyor ama biz düşmüyorsak NET'lerimiz
   * bugüne kadar OLDUĞUNDAN İYİ görünmüştür. Kanal kesmiyorsa Melontik
   * tahmini bir kalem düşüyor demektir ve düzeltme BİZDE değil beyanda.
   */
  console.log("  ── 4) ÖDEME HİZMETİ HİPOTEZİ ──────────────────────────────");

  const tahsilatKalemleri = await prisma.settlementItem.groupBy({
    by: ["code"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  console.log("     A) KANAL BİZE KESİYOR MU (hakediş kalemleri):");
  const ilgili = tahsilatKalemleri.filter((g) =>
    ["TAHSILAT_BEDELI", "HIZMET_BEDELI", "PLATFORM_HIZMET", "DIGER"].includes(
      String(g.code),
    ),
  );
  if (ilgili.length === 0) {
    console.log("        Tahsilat/hizmet bedeli satırı YOK.");
    console.log("        → Kanal bize böyle bir kesinti kesmiyor (ya da rapor");
    console.log("          yüklenmemiş). Melontik tahmini düşüyor olabilir.");
  } else {
    for (const g of ilgili) {
      console.log(
        `        ${doldur(String(g.code), 18)} ${doldur(String(g._count._all), 6)} satır  ${para(Number(g._sum.amount?.toString() ?? 0))}`,
      );
    }
  }
  console.log("");

  console.log("     B) KÂR MOTORU DÜŞÜYOR MU (kanal kesinti kuralları):");
  const kurallar = await prisma.channelFee.findMany({
    where: { isActive: true },
    select: {
      code: true,
      scope: true,
      basis: true,
      rate: true,
      amount: true,
      channel: { select: { name: true } },
    },
    orderBy: [{ channel: { name: "asc" } }, { code: "asc" }],
  });
  if (kurallar.length === 0) {
    console.log("        Tanımlı kesinti kuralı YOK.");
  } else {
    for (const k of kurallar) {
      console.log(
        `        ${doldur(k.channel.name, 14)} ${doldur(k.code, 18)} ${doldur(k.scope, 10)} ${doldur(k.basis, 12)} ` +
          `${k.rate === null ? "" : `oran ${k.rate.toString()}`}${k.amount === null ? "" : `tutar ${k.amount.toString()}`}`,
      );
    }
  }
  console.log("");
  console.log("     Karşılaştır: yukarıdaki 'farkın ayrışması' bölümünde");
  console.log("     masraf katkısı POZİTİFSE, biz bir kalemi düşmüyoruz.");
  console.log("     O kalemin adı A) listesinde görünüyorsa kanal gerçekten");
  console.log("     kesiyor demektir ve motora eklenmelidir.");
  console.log("");

  await prisma.$disconnect();
}

main();
