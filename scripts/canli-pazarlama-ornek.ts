import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  PAZARLAMA ÖRNEĞİ — GERÇEK BİR ZARAR SATIŞI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:pazarlama-ornek
 *
 *  ⛔ NİYE VAR: `pazarlama/tanitim.html` sayfası _"buradaki her rakam o
 *  defterden ölçüldü — temsilî örnek değil"_ diyor. Ama sayfadaki kanıt
 *  tablosu TUTMUYORDU: kalemler toplandığında **+₺43,15 (kâr)** çıkıyor,
 *  tabloda **−₺43,85 (zarar)** yazıyordu — ₺87,00 fark. Sayfanın manşeti
 *  (_"ekranda kârlı görünen satış, gerçekte zarardaydı"_) tam o rakamın
 *  negatif olmasına dayanıyor.
 *
 *  ⚠ RAKAM UYDURULMAZ. Anayasa: _"sistem, bilmediği şey hakkında yazı
 *  yazmaz"_ ve _"aykırı değer uydurularak düzeltilmez."_ O yüzden tablo
 *  elle onarılmıyor; defterden GERÇEK bir zarar satışı çekiliyor ve sayfa
 *  onun kalemleriyle yeniden yazılıyor.
 *
 *  ── SALT OKUMA ──────────────────────────────────────────────────────────
 *  Hiçbir şey yazılmaz. Tek yaptığı `findMany` ve ekrana basmak.
 *
 *  ── ⚠ KİMLİK BİLGİSİ SAYFAYA GİRMEZ ─────────────────────────────────────
 *  Betik sipariş numarasını ve ürün adını EKRANA basar (kullanıcı hangi
 *  satışa baktığını bilsin diye), ama tanıtım sayfasına yalnız TUTARLAR
 *  taşınır. Bir pazarlama sayfası müşterinin sipariş numarasını taşımaz.
 *
 *  BETIK SINIFI: TEK_SEFERLIK — tanıtım sayfasındaki tabloyu bir kez gerçek
 *  veriden kurmak için yazıldı; stok/kâr YAZMAZ, yalnız okur ve raporlar.
 * ============================================================================
 */

/** Kesinti kodlarının sayfada görüneceği sıra — ekrandaki tabloyla aynı. */
const SIRA = [
  "MALIYET",
  "KOMISYON",
  "KOMISYON_KDV",
  "ODEME_GIDERI",
  "HIZMET_BEDELI",
  "SABIT_GIDER",
  "KARGO",
  "KARGO_KDV",
  "STOPAJ",
  "ODENECEK_KDV",
];

function tl(d: unknown): number {
  return Number(d ?? 0);
}

function bicim(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  console.log("PAZARLAMA ÖRNEĞİ — gerçek zarar satışı");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA — hiçbir şey yazılmaz");
  console.log("");

  /**
   * ⚠ İPTAL SÜZGECİ ŞART. İptal edilmiş bir satış ciroya/NET'e girmiyor;
   * onu "zarar örneği" diye yayımlamak, kaybetmeyen bir kaydı kayıp
   * göstermek olurdu. _(25.08 dersi: kayıp abartısı, kayıp küçültmesi kadar
   * yanlıştır — ve daha az sorgulanır.)_
   */
  /**
   * ⛔ SÜZGEÇ `Sale` ÜZERİNDE — `SaleItem` ÜZERİNDE DEĞİL. İlk yazımda
   * `SaleItem.net2Amount < 0` kullanıldı ve rakamlar tutmadı; motoru okuyunca
   * sebep çıktı:
   *
   *   kalem NET-1  = satış − maliyet − komisyon − stopaj
   *   sipariş NET-1 = Σ kalem NET-1 − SİPARİŞ kesintileri
   *
   * Yani **kargo, ödeme gideri, hizmet bedeli ve sabit gider kalem NET'ine
   * GİRMİYOR** (sipariş düzeyindeler). `SaleItem.net2Amount`ı "bu satışın
   * NET-2'si" diye yayımlamak, kesintilerin bir kısmını yok saymak olurdu —
   * ve rakam olduğundan İYİ görünürdü. _(Anayasa: "bir sayı etiketiyle
   * taşınır"; etiket düşünce sayı doğru kalır ama iddia yanlışa döner.)_
   */
  const kalemler = await prisma.saleItem.findMany({
    where: {
      sale: {
        iptalTarihi: null,
        profitStatus: "CALCULATED",
        net2Amount: { lt: 0 },
      },
    },
    select: {
      quantity: true,
      unitPriceAmount: true,
      unitPriceCurrency: true,
      commissionRate: true,
      net1Amount: true,
      net2Amount: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
      sale: {
        select: {
          id: true,
          code: true,
          soldAt: true,
          channelAccount: {
            select: { name: true, channel: { select: { name: true } } },
          },
          items: { select: { id: true } },
          fees: { select: { code: true, amount: true, saleItemId: true } },
          /** ⭐ SİPARİŞ DÜZEYİ NET — yayımlanacak rakam budur. */
          net1Amount: true,
          net2Amount: true,
        },
      },
    },
  });

  console.log("  net2 < 0 olan (iptal HARİÇ) kalem: " + kalemler.length);

  /**
   * ⭐ PAYDA — ORAN SAYISI KAPSAMIYLA YAZILIR.
   *
   * "115 satış zarardaydı" tek başına kullanılamaz: 200 satışta mı, 5.000
   * satışta mı? Sayfaya giren her oran/adet, hangi küme içinden çıktığını da
   * taşımak zorunda. _(Anayasa: pano kuralı — oran sayısı kapsamıyla yazılır.)_
   */
  const kapsam = await prisma.sale.count({
    where: { iptalTarihi: null, profitStatus: "CALCULATED" },
  });
  console.log("  KAPSAM: kârı hesaplanmış, iptal olmayan satış: " + kapsam);

  /**
   * TEK KALEMLİ, TEK ADETLİ satış aranıyor: tanıtım tablosu tek bir satışın
   * kalem kalem dökümü, çok kalemli bir siparişin payları değil.
   */
  const uygun = kalemler.filter(
    (k) => k.sale.items.length === 1 && k.quantity === 1,
  );
  console.log("  ...bunların tek kalemli + tek adetli olanı: " + uygun.length);

  const kanallar = new Map<string, number>();
  for (const k of uygun) {
    const ad = k.sale.channelAccount.channel.name;
    kanallar.set(ad, (kanallar.get(ad) ?? 0) + 1);
  }
  console.log("  kanal dağılımı: " + JSON.stringify([...kanallar]));
  console.log("");

  if (uygun.length === 0) {
    /** ⚠ "0 buldum" ile "temiz" ayrı şeydir — boş sonuç hüküm değildir. */
    console.log("  ⛔ UYGUN ÖRNEK YOK. Sayfadaki tablo gerçek bir satıştan");
    console.log("     kurulamaz; tez yeniden düşünülmeli.");
    return;
  }

  /**
   * ⭐ EN AÇIKLAYICI ÖRNEK SEÇİLİYOR: brüt farkı POZİTİF ama NET-2'si
   * NEGATİF olan satış. Sayfanın tezi tam olarak budur — "ekranda kârlı
   * görünen satış, gerçekte zarardaydı." Brüt farkı da negatif olan bir
   * satış tezi anlatmaz: orada zaten zarar görünüyordur.
   */
  const adaylar = uygun
    .map((k) => {
      const fiyat = tl(k.unitPriceAmount) * k.quantity;
      const maliyet = Math.abs(
        tl(
          k.sale.fees.find((f) => f.code === "MALIYET" && f.saleItemId !== null)
            ?.amount ??
            k.sale.fees.find((f) => f.code === "MALIYET")?.amount ??
            0,
        ),
      );
      return {
        k,
        fiyat,
        maliyet,
        brut: fiyat - maliyet,
        net2: tl(k.sale.net2Amount),
      };
    })
    .filter((a) => a.brut > 0)
    /**
     * ⛔ KURUŞA KAPANMA ŞARTI. Sayfaya basılan tablo okuyucu tarafından
     * TOPLANACAK. Kalemler kuruşa yuvarlandığında toplam kayıtlı NET-2 ile
     * BİREBİR tutmuyorsa o örnek yayımlanmaz: kapanmayan bir tablo, tam da
     * satmaya çalıştığı şeyi çürütür. (Motor `Decimal(18,4)` tutuyor;
     * gösterimde iki hane kaldığı için bazı satışta 1 kuruş kaçıyor.)
     */
    .map((a) => {
      const kur = (n: number) => Math.round(n * 100) / 100;
      const net1 = tl(a.k.sale.net1Amount);
      const net2 = tl(a.k.sale.net2Amount);
      const kdv = kur(net1 - net2);
      const kesintiler = a.k.sale.fees.map((f) => kur(tl(f.amount)));
      const toplam = kur(
        kur(a.fiyat) - kesintiler.reduce((t, n) => t + n, 0) - kdv,
      );
      return { ...a, kurusaKapaniyor: Math.abs(toplam - kur(net2)) < 0.005 };
    })
    .sort((a, b) => b.brut - a.brut);

  console.log("  brütü POZİTİF ama NET-2'si NEGATİF olan: " + adaylar.length);
  const kapanan = adaylar.filter((a) => a.kurusaKapaniyor);
  console.log("  ...tablosu KURUŞUNA kapanan (yayımlanabilir): " + kapanan.length);
  const hbKapanan = kapanan.filter(
    (a) => a.k.sale.channelAccount.channel.name === "Hepsiburada",
  );
  console.log("  ...bunların Hepsiburada olanı: " + hbKapanan.length);
  console.log("");

  if (adaylar.length === 0) {
    console.log("  ⛔ Tezi anlatan örnek yok (hepsinin brütü de negatif).");
    return;
  }

  /** ⚠ YALNIZ KURUŞUNA KAPANAN adaylar basılıyor — ötekiler yayımlanamaz. */
  for (const aday of (kapanan.length ? kapanan : adaylar).slice(0, 6)) {
    const k = aday.k;
    console.log(
      "  ─────────────────────────────────────────────────────────────",
    );
    console.log(
      "  " +
        k.sale.channelAccount.channel.name +
        " · " +
        k.sale.channelAccount.name +
        " · sipariş " +
        (k.sale.code ?? "—") +
        " · " +
        k.sale.soldAt.toISOString().slice(0, 10),
    );
    console.log(
      "  ürün: " +
        (k.variant.product.name ?? "—") +
        "  (" +
        k.variant.sku +
        ")   adet " +
        k.quantity +
        "   komisyon %" +
        (k.commissionRate === null ? "—" : tl(k.commissionRate)),
    );
    console.log("");
    console.log(
      "    Satış fiyatı".padEnd(34) +
        bicim(aday.fiyat).padStart(12) +
        "  " +
        k.unitPriceCurrency,
    );

    for (const kod of SIRA) {
      const satirlar = k.sale.fees.filter((f) => f.code === kod);
      if (satirlar.length === 0) continue;
      const toplam = satirlar.reduce((t, f) => t + tl(f.amount), 0);
      console.log(
        ("    " + kod).padEnd(34) +
          bicim(toplam).padStart(12) +
          (satirlar.length > 1 ? "   (" + satirlar.length + " satır)" : ""),
      );
    }
    /** ⚠ SIRALAMADA OLMAYAN KOD SESSİZCE DÜŞMEZ — yoksa toplam tutmaz. */
    for (const f of k.sale.fees) {
      if (!SIRA.includes(f.code)) {
        console.log(
          ("    ⚠ " + f.code + " (sıralamada YOK)").padEnd(34) +
            bicim(tl(f.amount)).padStart(12),
        );
      }
    }

    /**
     * ⚠ KESİNTİLER DEFTERDE POZİTİF TUTULUYOR (ilk yazımda negatif
     * varsayılmıştı ve doğrulama satırı saçma bir toplam basıyordu).
     * Ölçüldü ve düzeltildi.
     */
    const kesintiToplam = k.sale.fees.reduce((t, f) => t + tl(f.amount), 0);
    const net1 = tl(k.sale.net1Amount);
    const net2 = tl(k.sale.net2Amount);
    /**
     * ⭐ ÖDENECEK KDV'NİN KENDİ `SaleFee` SATIRI YOK — motor onu NET-2
     * adımında hesaplıyor. Farktan türetiliyor ve tablo böylece KAPANIYOR.
     */
    const odenecekKdv = net1 - net2;

    console.log("    " + "─".repeat(44));
    console.log(
      "    kesintiler toplamı (SaleFee)".padEnd(34) +
        bicim(kesintiToplam).padStart(12),
    );
    console.log(
      "    ödenecek KDV (NET1−NET2)".padEnd(34) +
        bicim(odenecekKdv).padStart(12),
    );
    console.log(
      "    SİPARİŞ NET-1 (kayıtlı)".padEnd(34) + bicim(net1).padStart(12),
    );
    console.log(
      "    SİPARİŞ NET-2 (kayıtlı)".padEnd(34) + bicim(net2).padStart(12),
    );

    /**
     * ⛔ TABLONUN KAPANDIĞI BURADA SINANIYOR. Yayımlanacak tablo okuyucu
     * tarafından TOPLANACAK; kapanmayan bir tablo, tam da satmaya çalıştığı
     * şeyi çürütür. (Sayfadaki eski tablo tam bu yüzden düştü.)
     */
    const hesaplanan = aday.fiyat - kesintiToplam - odenecekKdv;
    const sapma = Math.abs(hesaplanan - net2);
    console.log(
      "    ⇒ fiyat − kesinti − KDV".padEnd(34) +
        bicim(hesaplanan).padStart(12) +
        (sapma < 0.005
          ? "   ✓ NET-2 ile TUTUYOR"
          : "   ⛔ SAPMA " + bicim(sapma)),
    );
    console.log("");
  }

}

main()
  .then(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    /** ⚠ HATA YOLUNDA DA BAĞLANTI KAPANIR — ilk koşumda betik asılı kaldı. */
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
