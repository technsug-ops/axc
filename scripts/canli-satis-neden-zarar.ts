/**
 * ============================================================================
 *  BİR SATIŞ NİYE ZARARDA — AYNI ÜRÜNÜN ÖTEKİ SATIŞLARIYLA YAN YANA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:satis-neden-zarar -- <siparişNo>
 *
 *  BETIK SINIFI: SUREKLI — soru her tekrarladığında koşulur. SALT OKUMA.
 *
 *  ── NİYE ─────────────────────────────────────────────────────────────────
 *  Kullanıcı 02.09.2026: _"Nasıl oluyor bu durum hem kârda hem zararda?"_
 *  Ürün kartı ortalama **NET-2/adet +518,24** diyor, tek bir satış
 *  **−72,96** gösteriyor.
 *
 *  ⛔ İKİSİ ÇELİŞMİYOR — FARKLI ŞEYLER: kart 19 satışın ORTALAMASI, satır
 *  TEK bir olay. Ama "çelişmiyor" demek yetmez; ASIL SORU şudur: bu satışı
 *  ötekilerden ayıran ne? Cevap uydurulmaz, kalem kalem ÖLÇÜLÜR.
 *  _(Anayasa: "imkânsız görünen değer önce DOĞRULANIR — düzeltilmez".)_
 *
 *  ⚠ VE ORTALAMA İLE TEK OLAY KARŞILAŞTIRILIRKEN PAYDA SORULUR: kart
 *  "kâr hesaplanabilen satışların ortalaması" diyor — maliyeti bilinmeyen
 *  satışlar paydaya girmiyor. Bu betik onları AYRI sayar.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const HEDEF = process.argv.find((a) => /^\d{8,}$/.test(a));

function para(x: unknown): string {
  const n = Number(String(x));
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
}
function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
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

  /**
   * ⭐ KİMLİK VERİLMEDİYSE ZARARDAKİLERİ LİSTELE.
   *
   * ⛔ VE BU MOD BİR HATADAN DOĞDU: kullanıcının ekran görüntüsünden
   * sipariş numarasını GÖZLE okudum ve defterde bulunamadı. Rakamı
   * ekrandan okuyup üstüne sorgu kurmak, kimliği TAHMİN etmektir.
   * Doğrusu: kaydı ÖZELLİĞİNDEN bul (zararda + kanal + tarih), kimliği
   * defterin kendisi söylesin.
   * _(Anayasa: "kimlik varken dizeyle aranmaz" — burada elimde kimlik
   * YOKTU, olduğunu sanıyordum.)_
   */
  if (!HEDEF) {
    console.log("=".repeat(80));
    console.log("  ZARARDAKİ SATIŞLAR (NET-2 < 0, iptal hariç) — son 40");
    console.log("=".repeat(80));
    const zararlilar = await prisma.sale.findMany({
      where: { iptalTarihi: null, profitStatus: "CALCULATED", net2Amount: { lt: 0 } },
      select: {
        code: true,
        soldAt: true,
        net2Amount: true,
        channelAccount: { select: { channel: { select: { name: true } } } },
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            variant: { select: { sku: true, product: { select: { name: true } } } },
          },
        },
      },
      orderBy: { soldAt: "desc" },
      take: 40,
    });
    for (const s of zararlilar) {
      const ciro = s.items.reduce(
        (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
        0,
      );
      console.log(
        `  ${gun(s.soldAt)}  ${String(s.code).padEnd(14)}` +
          `${s.channelAccount.channel.name.padEnd(13)}` +
          `ciro ${para(ciro).padStart(10)}  NET-2 ${para(s.net2Amount).padStart(10)}  ` +
          (s.items[0]?.variant.product.name ?? "—").slice(0, 30),
      );
    }
    console.log(`\n  toplam ${zararlilar.length} kayıt listelendi.`);
    console.log("  Ayrıntı için: npm run canli:satis-neden-zarar -- <siparişNo>\n");
    await prisma.$disconnect();
    return;
  }

  console.log("=".repeat(80));
  console.log(`  ${HEDEF} — NİYE ZARARDA? (salt okuma)`);
  console.log("=".repeat(80));

  const satis = await prisma.sale.findFirst({
    where: { code: HEDEF },
    include: {
      channelAccount: {
        select: { name: true, channel: { select: { name: true, code: true } } },
      },
      fees: true,
      items: {
        include: {
          fees: true,
          variant: {
            select: { id: true, sku: true, product: { select: { name: true } } },
          },
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
    },
  });
  if (satis === null) {
    /**
     * ⛔ "BULUNAMADI" İLE "YOK" AYRI ŞEYLER — hangisi olduğu SÖYLENİR.
     * Kimlik `code`ta olmayabilir: gönderi numarası (`shipmentCode`) ya da
     * kısmi bir yazım olabilir. Tek bir eşleşme denemesinden sonra "yok"
     * demek, aramanın kapsamını hüküm sanmaktır.
     * _(Anayasa: "sıfır üç farklı şey olabilir — üçü ayrı sayılır".)_
     */
    const yakinlar = await prisma.sale.findMany({
      where: {
        OR: [
          { code: { contains: HEDEF } },
          { shipmentCode: { contains: HEDEF } },
        ],
      },
      select: { code: true, shipmentCode: true, soldAt: true },
      take: 10,
    });
    console.log(`⛔ '${HEDEF}' ile TAM eşleşen satış yok.`);
    if (yakinlar.length === 0) {
      console.log("   kısmi eşleşme de YOK — bu kimlik defterde hiç geçmiyor.");
    } else {
      console.log("   ⭐ kısmi eşleşenler:");
      for (const s of yakinlar) {
        console.log(
          `      code=${s.code ?? "—"}  shipmentCode=${s.shipmentCode ?? "—"}` +
            `  ${gun(s.soldAt)}`,
        );
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n  ${gun(satis.soldAt)}  ·  ${satis.channelAccount.channel.name}` +
      ` — ${satis.channelAccount.name}  ·  durum ${satis.profitStatus ?? "—"}`,
  );
  console.log(
    `  NET-1 ${para(satis.net1Amount)}   NET-2 ${para(satis.net2Amount)}`,
  );

  /** ① KALEM KALEM — fiyat, maliyet, kesinti. */
  console.log("\n① BU SATIŞIN KALEMLERİ");
  let ciro = 0;
  let maliyetToplam = 0;
  const varyantlar: string[] = [];
  for (const it of satis.items) {
    const fiyat = Number(it.unitPriceAmount.toString()) * it.quantity;
    const maliyet = it.stockMovements.reduce(
      (t, h) =>
        t +
        (h.unitCostAmount === null
          ? 0
          : Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta)),
      0,
    );
    ciro += fiyat;
    maliyetToplam += maliyet;
    varyantlar.push(it.variant.id);
    console.log(
      `   ${it.variant.sku.padEnd(14)} ${it.quantity}×  ` +
        `fiyat ${para(fiyat).padStart(11)}  maliyet ${para(maliyet).padStart(11)}` +
        `  brüt ${para(fiyat - maliyet).padStart(11)}   ` +
        it.variant.product.name.slice(0, 28),
    );
    for (const f of it.fees) {
      console.log(`      kalem kesintisi  ${f.code.padEnd(22)} ${para(f.amount).padStart(11)}`);
    }
  }
  /**
   * ⛔ İKİ ÇİFT SAYIM TUZAĞI — İLK YAZIMDA İKİSİNE DE DÜŞTÜM (02.09.2026).
   *
   * ① `satis.fees` SÜZGEÇSİZ çekilince KALEM kesintilerini de getiriyor;
   *    kalem döngüsünde bir kez daha toplanınca STOPAJ iki kez sayıldı.
   *    Sipariş geneli olanlar `saleItemId === null` olanlardır.
   * ② `MALIYET` kodu bir KESİNTİ DEĞİL, maliyetin kendisidir. Kesintiye
   *    eklenince maliyet iki kez düşüldü.
   *
   * Sonuç: özet satırı `−8.944,17` yazacaktı, defterdeki NET-2 ise
   * `−72,96`. Rakam makul görünmüyordu ve bu yüzden yakalandı — makul
   * görünseydi yayımlanacaktı.
   * _(Anayasa: "aracın çıktısı okunur — rengi ya da kodu değil".)_
   */
  console.log("\n   SİPARİŞ GENELİ KESİNTİLER (MALIYET hariç — o kesinti değil)");
  let kesinti = 0;
  const siparisGeneli = satis.fees.filter((f) => f.saleItemId === null);
  for (const f of siparisGeneli) {
    if (f.code === "MALIYET") {
      console.log(`      ${"(MALIYET)".padEnd(25)} ${para(f.amount).padStart(11)}   ← maliyet satırı, kesinti DEĞİL`);
      continue;
    }
    kesinti += Math.abs(Number(f.amount.toString()));
    console.log(`      ${f.code.padEnd(25)} ${para(f.amount).padStart(11)}`);
  }
  for (const f of satis.items.flatMap((i) => i.fees)) {
    if (f.code === "MALIYET") continue;
    kesinti += Math.abs(Number(f.amount.toString()));
  }
  const brut = ciro - maliyetToplam;
  console.log(
    `\n   ciro ${para(ciro)}  −  maliyet ${para(maliyetToplam)}  =  brüt ${para(brut)}`,
  );
  console.log(
    `   brüt ${para(brut)}  −  kesinti ${para(kesinti)}  =  ${para(brut - kesinti)}`,
  );
  /**
   * ⭐ VE HESAP DEFTERLE KARŞILAŞTIRILIYOR: kendi toplamımı doğru sanıp
   * yayımlamak yerine, motorun yazdığı NET-1 ile yan yana konuyor. Ayrışma
   * varsa BU RAPOR yanlıştır, defter değil.
   */
  const defterNet1 = satis.net1Amount === null ? null : Number(satis.net1Amount.toString());
  if (defterNet1 !== null) {
    const fark = brut - kesinti - defterNet1;
    console.log(
      `   defterdeki NET-1 ${para(defterNet1)}  ·  fark ${para(fark)}` +
        (Math.abs(fark) < 1 ? "  ✓ tutuyor" : "  ⛔ AYRIŞIYOR — bu rapor eksik sayıyor"),
    );
  }

  /**
   * ② AYNI ÜRÜNÜN ÖTEKİ SATIŞLARI — ASIL CEVAP BURADA.
   *
   * ⚠ İPTAL SÜZGECİ ŞART: iptal satış ciroya girmez; ortalamaya katmak
   * kartın rakamıyla ayrışma üretirdi.
   */
  console.log("\n② AYNI VARYANTIN ÖTEKİ SATIŞLARI — ne değişti");
  const kardesler = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      items: { some: { variantId: { in: varyantlar } } },
    },
    select: {
      code: true,
      soldAt: true,
      net2Amount: true,
      profitStatus: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        where: { variantId: { in: varyantlar } },
        select: {
          quantity: true,
          unitPriceAmount: true,
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
    },
    orderBy: { soldAt: "asc" },
  });

  console.log(
    "   tarih       kanal          fiyat/ad    maliyet/ad     NET-2   durum",
  );
  const kanalNet = new Map<string, { n: number; toplam: number }>();
  let hesaplanamayan = 0;
  for (const k of kardesler) {
    const adet = k.items.reduce((t, i) => t + i.quantity, 0);
    const fiyat = k.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
    const mal = k.items.reduce(
      (t, i) =>
        t +
        i.stockMovements.reduce(
          (u, h) =>
            u +
            (h.unitCostAmount === null
              ? 0
              : Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta)),
          0,
        ),
      0,
    );
    const kanal = k.channelAccount.channel.name;
    if (k.profitStatus === "CALCULATED" && k.net2Amount !== null) {
      const g = kanalNet.get(kanal) ?? { n: 0, toplam: 0 };
      g.n += 1;
      g.toplam += Number(k.net2Amount.toString());
      kanalNet.set(kanal, g);
    } else hesaplanamayan += 1;

    const bu = k.code === HEDEF ? " ⭐" : "  ";
    console.log(
      `  ${bu}${gun(k.soldAt)}  ${kanal.padEnd(13)}` +
        `${para(adet ? fiyat / adet : 0).padStart(10)}` +
        `${para(adet ? mal / adet : 0).padStart(13)}` +
        `${para(k.net2Amount).padStart(11)}   ${k.profitStatus ?? "—"}`,
    );
  }

  /** ③ KANAL KANAL ORTALAMA — kesinti kuralları kanala göre değişir. */
  console.log("\n③ KANAL BAZINDA ORTALAMA NET-2 (yalnız CALCULATED)");
  for (const [kanal, g] of [...kanalNet.entries()].sort(
    (a, b) => b[1].toplam / b[1].n - a[1].toplam / a[1].n,
  )) {
    console.log(
      `   ${kanal.padEnd(15)} n=${String(g.n).padStart(3)}` +
        `   ortalama NET-2 ${para(g.toplam / g.n).padStart(11)}`,
    );
  }
  if (hesaplanamayan > 0) {
    console.log(
      `   ⚠ ${hesaplanamayan} satış CALCULATED değil → ortalamaya GİRMİYOR.`,
    );
    console.log(
      "     Kartın 'kâr hesaplanabilen satışların ortalaması' notu bunu anlatır.",
    );
  }

  console.log("\n" + "-".repeat(80));
  console.log("  ⛔ HÜKÜM YOK. Bu rapor farkın NEREDEN geldiğini gösterir");
  console.log("     (fiyat mı, maliyet mi, kanal kesintisi mi); rakamın");
  console.log("     YANLIŞ olduğunu söylemez. Aykırı değer önce DOĞRULANIR.");
  console.log("=".repeat(80) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
