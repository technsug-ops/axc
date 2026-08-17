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
  const melontikCirolari = melontikTutarlari();

  console.log("");
  console.log("MELONTİK ÇAPRAZ TEYİT — AŞAMA 0");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log(
    `  Melontik   ${melontik.size > 0 ? `${melontik.size} sipariş için referans var` : "referans YOK (yalnız bizim taraf basılır)"}`,
  );
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

    const kesinti = (c: string) =>
      s.fees
        .filter((f) => f.code === c)
        .reduce((t, f) => t + Number(f.amount.toString()), 0);

    const ciro = s.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    );
    const net2 = s.net2Amount === null ? null : Number(s.net2Amount.toString());
    const bizim = melontik.get(kod);

    console.log(`     ${kod}  ${s.items[0]?.variant.product.name.slice(0, 44) ?? ""}`);
    /**
     * CİRO DA KARŞILAŞTIRILIR. Kâr tutmuyorsa ilk sorulacak soru "aynı
     * satıştan mı bahsediyoruz" olmalı: ciro tutmuyorsa fark kâr
     * motorunda değil, kaydın kendisindedir (eksik kalem, farklı fiyat).
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
    console.log(`        maliyet       ${para(kesinti("MALIYET"))}`);
    console.log(`        komisyon      ${para(kesinti("KOMISYON"))}`);
    console.log(`        kargo         ${para(kesinti("KARGO"))}`);
    console.log(`        stopaj        ${para(kesinti("STOPAJ"))}`);
    console.log(`        ödenecek KDV  ${para(kesinti("ODENECEK_KDV"))}`);
    console.log(
      `        NET-1         ${para(s.net1Amount === null ? null : Number(s.net1Amount.toString()))}`,
    );
    console.log(`        NET-2         ${para(net2)}   ← bizim hükmümüz`);

    if (s.profitStatus !== null && s.profitStatus !== "CALCULATED") {
      console.log(`        ⚠ kâr durumu: ${s.profitStatus}`);
    }

    if (bizim === undefined) {
      console.log(`        Melontik      —   (rakam verilmedi)`);
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
    if (tutmayan === 0 && tutan > 0) {
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

  await prisma.$disconnect();
}

main();
