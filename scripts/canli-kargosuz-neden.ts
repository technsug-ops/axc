/**
 * ============================================================================
 *  KARGOSUZ SATIŞLAR NİYE KARGOSUZ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:kargosuz-neden
 *
 *  BETIK SINIFI: TEK_SEFERLIK. ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⛔ KULLANICI BULDU ──────────────────────────────────────────────────
 *  Kargosuz satış listesinde `durum` sütunu **CALCULATED** yazıyor.
 *  Kullanıcı: _"burada calculated yazıyor."_
 *
 *  ⭐ VE HAKLI — ÇÜNKÜ `CALCULATED` YANILTICI: kâr motorunun ÇALIŞTIĞINI
 *  söyler, **her maliyetin HESABA GİRDİĞİNİ değil.** Kargo `null` iken de
 *  motor sonuç üretir ve durum `CALCULATED` olur. Yani bu satışların
 *  NET'i, kargo düşülmeden hesaplanmış bir NET'tir.
 *
 *  ⚠ Şemada `NO_COST` · `RULE_MISSING` · `CURRENCY_MISMATCH` var; eksik
 *  KARGO için bir durum YOK. Kargosuz satış, kargolu satıştan ekranda
 *  ayırt edilemiyor.
 *  _(Anayasa: "alanın dolu olması, olayın gerçekleştiğini göstermez";
 *  "kolon başlığı bir iddiadır".)_
 *
 *  ── SORULAN ────────────────────────────────────────────────────────────
 *  Bu satışların kargosu KAYNAK DOSYADA var mı?
 *    (a) dosyada VAR → yazım onları neden atladı? ⛔ GERÇEK EKSİK
 *    (b) dosyada YOK → sistem bilmiyor; boş kalması bir BEYAN
 *  İkisi tek rakamda toplanırsa (a) gizlenir.
 * ============================================================================
 */

import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { paketiNormalle } from "../src/lib/tablo/paket";

/** `canli-kargo-yaz.ts` ile AYNI dosya — iki araç aynı kaynağı okumalı. */
const DOSYA = "C:/Users/yapra/Desktop/excel/satis.xlsx";

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
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

  console.log("=".repeat(88));
  console.log("  KARGOSUZ SATIŞLAR NİYE KARGOSUZ (salt okuma)");
  console.log("=".repeat(88));

  /** ── kaynak dosya: sipariş no → KARGO değeri ───────────────────────── */
  /**
   * ⛔ SAYFA SEÇİMİ `canli-kargo-yaz.ts` İLE BİREBİR AYNI OLMAK ZORUNDA.
   *
   * İlk yazımda `[0]` (ilk sayfa) aldım ve sütunlar bulunamadı. Yazım
   * betiği adında "SATIŞ" geçen sayfayı arıyor — dosyada birden çok sayfa
   * var. İki araç aynı kaynağı okumazsa çıkardıkları sayı aynı soruya iki
   * cevap verir.
   * ⭐ Betik "0 bulundu" demedi, "ÖLÇÜM YOK" dedi ve hata BURADA görüldü.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
   * değildir".)_
   */
  const sayfalar = await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt);
  const sayfa = sayfalar.find((x) =>
    String((x as unknown as { sheet: string }).sheet).includes("SATIŞ"),
  ) as unknown as { data: unknown[][] } | undefined;
  if (sayfa === undefined) {
    console.log("  ⛔ 'SATIŞ' sayfası bulunamadı — ÖLÇÜM YOK.");
    console.log(
      "     sayfalar: " +
        sayfalar
          .map((x) => String((x as unknown as { sheet: string }).sheet))
          .join(" · "),
    );
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const veri = sayfa.data;
  /**
   * ⛔ BAŞLIK SATIRI `data[5]`, VERİ `slice(6)` — yazım betiğinden birebir.
   * `data[0]` denedim, sütunlar bulunamadı: dosyanın ilk beş satırı başlık
   * değil. Kaynağın ŞEKLİ de ölçütün parçasıdır.
   */
  const baslik = (veri[5] ?? []).map((c) => String(c ?? "").trim());
  const iNo = baslik.indexOf("Sipariş Numarası");
  const iKargo = baslik.indexOf("KARGO");
  const iTur = baslik.indexOf("TÜR");
  console.log(`\n  kaynak: ${DOSYA}`);
  console.log(`  sipariş no sütunu: ${iNo} (${baslik[iNo] ?? "—"})`);
  console.log(`  KARGO sütunu     : ${iKargo} (${baslik[iKargo] ?? "—"})`);
  if (iNo < 0 || iKargo < 0) {
    console.log("  ⛔ SÜTUN BULUNAMADI — ÖLÇÜM YOK ('dosyada yok' DEMEK DEĞİL).");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /** ⚠ Aynı siparişin birden çok satırı olabilir — değerler toplanmaz,
   *  ÇELİŞKİ olarak işaretlenir (kargo sipariş başınadır). */
  const dosyaKargo = new Map<string, { deger: number; celiski: boolean }>();
  /** ⚠ `TÜR = "satış"` SÜZGECİ DE YAZIM BETİĞİNDEN: dosyada iade/gider
   *  satırları da var ve onların kargosu bu soruya ait değil. */
  for (const r of veri.slice(6)) {
    if (iTur >= 0 && String(r[iTur] ?? "").trim() !== "satış") continue;
    const no = String(r[iNo] ?? "").trim();
    if (no === "") continue;
    const ham = r[iKargo];
    if (ham === null || ham === undefined || ham === "") continue;
    const d = Number(String(ham).replace(",", "."));
    if (!Number.isFinite(d)) continue;
    const onceki = dosyaKargo.get(no);
    if (onceki === undefined) dosyaKargo.set(no, { deger: d, celiski: false });
    else if (Math.abs(onceki.deger - d) > 0.005) onceki.celiski = true;
  }
  console.log(`  dosyada kargolu sipariş: ${dosyaKargo.size}`);

  /** ── kargosuz satışlar ─────────────────────────────────────────────── */
  const kargosuz = await prisma.sale.findMany({
    where: { cargoAmount: null },
    select: {
      code: true,
      soldAt: true,
      /** ⭐ Deftere GİRİŞ anı — "28.08'de niye yazılmadı" sorusunun anahtarı. */
      createdAt: true,
      iptalTarihi: true,
      profitStatus: true,
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
  });
  const acik = kargosuz.filter((s) => s.iptalTarihi === null);

  /** ⚠ ÜÇ KOVA AYRI — tek rakam (a)'yı gizlerdi. */
  type Kova = "DOSYADA_VAR" | "DOSYADA_CELISKILI" | "DOSYADA_YOK";
  const kovalar = new Map<Kova, typeof acik>([
    ["DOSYADA_VAR", []],
    ["DOSYADA_CELISKILI", []],
    ["DOSYADA_YOK", []],
  ]);
  let kacanKargo = 0;
  for (const s of acik) {
    const d = dosyaKargo.get(String(s.code ?? ""));
    if (d === undefined) kovalar.get("DOSYADA_YOK")!.push(s);
    else if (d.celiski) kovalar.get("DOSYADA_CELISKILI")!.push(s);
    else {
      kovalar.get("DOSYADA_VAR")!.push(s);
      kacanKargo += d.deger;
    }
  }

  console.log("\n① AÇIK KARGOSUZ SATIŞLAR — ÜÇ KOVA");
  console.log(`   toplam açık kargosuz : ${acik.length}`);
  console.log(
    `   ⛔ (a) DOSYADA VAR    : ${kovalar.get("DOSYADA_VAR")!.length}` +
      `   ← GERÇEK EKSİK, kargo ₺${para(kacanKargo)} (KDV dahil)`,
  );
  console.log(
    `   ⚠ (b) DOSYADA ÇELİŞKİLİ: ${kovalar.get("DOSYADA_CELISKILI")!.length}` +
      "   ← aynı siparişe farklı kargo; yazım bilerek atlıyor",
  );
  console.log(
    `   ✓ (c) DOSYADA YOK     : ${kovalar.get("DOSYADA_YOK")!.length}` +
      "   ← sistem bilmiyor; boş kalması BEYAN",
  );

  /**
   * ② `CALCULATED` YANILTICISI — SAYIYLA.
   *
   * ⚠ Bu satışların NET'i kargo düşülmeden hesaplandı. Motorun ölçülmüş
   * kuralı: KDV hariç ₺100 kargo → ΔNET-2 −100,00 (KDV indiriliyor).
   * O hâlde NET-2 fazlalığı = kaçan kargonun KDV HARİÇ tutarıdır.
   */
  const calculatedVar = kovalar
    .get("DOSYADA_VAR")!
    .filter((s) => s.profitStatus === "CALCULATED");
  console.log("\n② `CALCULATED` NE SÖYLÜYOR, NE SÖYLEMİYOR");
  console.log(
    `   (a) kovasındaki ${kovalar.get("DOSYADA_VAR")!.length} satışın` +
      ` ${calculatedVar.length} tanesi CALCULATED`,
  );
  console.log("   ⛔ CALCULATED = 'motor çalıştı'. 'Kargo dâhil' DEMEK DEĞİL.");
  console.log("     Şemada eksik kargo için bir durum YOK; kargosuz satış");
  console.log("     kargolu satıştan ekranda ayırt EDİLEMİYOR.");
  console.log(
    `   ⭐ NET-2 FAZLALIĞI (yaklaşık): ₺${para(kacanKargo / 1.2)}` +
      "   (kaçan kargonun KDV hariç tutarı)",
  );

  /**
   * ③ (a) KOVASI — TEMİZ LİSTE, KONTROL EDİLECEK KÜME.
   *
   * ⚠ İKİ TABAN AYRI SÜTUN (İlke: para rakamı tabanıyla yazılır):
   *   `dosya kargo` KDV DAHİL — kullanıcının bildiği rakam
   *   `yazılacak`   KDV HARİÇ — `cargoAmount` alanına giren değer
   * Tek sütun olsaydı hangisine bakıldığı belirsiz kalırdı.
   *
   * ⭐ NET etkisi motorun ÖLÇÜLMÜŞ kuralından: ΔNET-2 = −(kargo KDV hariç).
   */
  const hedef = kovalar.get("DOSYADA_VAR")!;
  if (hedef.length > 0) {
    console.log("\n③ EKSİK KARGOSU OLAN SATIŞLAR — TEMİZ LİSTE");
    console.log("");
    console.log(
      "   #   tarih       sipariş no      kanal        " +
        "dosya(KDV dah)  yazılacak   NET-2 şimdi  NET-2 sonra  ürün",
    );
    console.log("   " + "-".repeat(112));
    const sirali = [...hedef].sort(
      (a, b) => b.soldAt.getTime() - a.soldAt.getTime(),
    );
    let no = 0;
    let toplamDahil = 0;
    let toplamHaric = 0;
    let zararaDusen = 0;
    for (const s of sirali) {
      no += 1;
      const d = dosyaKargo.get(String(s.code ?? ""))!;
      const haric = Math.round((d.deger / 1.2) * 100) / 100;
      const simdi = s.net2Amount === null ? null : Number(s.net2Amount.toString());
      const sonra = simdi === null ? null : simdi - haric;
      toplamDahil += d.deger;
      toplamHaric += haric;
      if (simdi !== null && simdi >= 0 && sonra !== null && sonra < 0) {
        zararaDusen += 1;
      }
      console.log(
        `   ${String(no).padStart(2)}  ` +
          s.soldAt.toISOString().slice(0, 10) +
          "  " +
          String(s.code ?? "—").padEnd(15) +
          s.channelAccount.channel.name.padEnd(12) +
          para(d.deger).padStart(13) +
          para(haric).padStart(12) +
          (simdi === null ? "—" : para(simdi)).padStart(13) +
          (sonra === null ? "—" : para(sonra)).padStart(13) +
          "  " +
          (s.items[0]?.variant.product.name ?? "—").slice(0, 30),
      );
    }
    console.log("   " + "-".repeat(112));
    console.log(
      `   TOPLAM ${no} satış` +
        `${para(toplamDahil).padStart(35)}${para(toplamHaric).padStart(12)}`,
    );
    /**
     * ⭐ NİYE 28.08 YAZIMINDA KAÇTILAR — TEK SORU, İKİ AYRI CEVAP.
     *
     * Satış deftere yazımdan SONRA girdiyse betik onu göremezdi (masum,
     * tekrar koşum çözer). ÖNCE girdiyse betik onu GÖRDÜ ve atladı —
     * sebebi bilinmeden tekrar koşum aynı sonucu verir.
     * ⛔ Bu ayrım yapılmadan "tekrar koş" demek, çözüm sanılan bir işi
     * boşa koşturmaktır.
     */
    const YAZIM = new Date("2026-08-28T00:00:00Z").getTime();
    const sonraGiren = sirali.filter((s) => s.createdAt.getTime() > YAZIM).length;
    const onceGiren = sirali.length - sonraGiren;
    console.log("\n   ⭐ NİYE 28.08 YAZIMINDA KAÇTILAR:");
    console.log(
      `      deftere 28.08'den SONRA girdi : ${sonraGiren}   ← betik göremezdi`,
    );
    console.log(
      `      deftere 28.08'den ÖNCE girdi  : ${onceGiren}` +
        (onceGiren > 0 ? "   ⛔ betik GÖRDÜ ve atladı — sebep bilinmiyor" : ""),
    );

    console.log(
      `\n   ⭐ NET-2 toplam düşüşü : ₺${para(toplamHaric)}` +
        "   (kargo KDV hariç kadar)",
    );
    console.log(
      `   ⚠ kârdan ZARARA düşecek satış : ${zararaDusen}` +
        "   ← yazımdan sonra ekranda kırmızı görünecek",
    );
  }

  const cikti = "veri/ozel/kargosuz-neden.csv";
  writeFileSync(
    cikti,
    "\ufeff" +
      [
        "kova;tarih;siparisNo;kanal;iptal;durum;net2;ciro;dosyaKargo",
        ...(["DOSYADA_VAR", "DOSYADA_CELISKILI", "DOSYADA_YOK"] as Kova[]).flatMap(
          (kova) =>
            kovalar.get(kova)!.map((s) => {
              const ciro = s.items.reduce(
                (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
                0,
              );
              const d = dosyaKargo.get(String(s.code ?? ""));
              return [
                kova,
                s.soldAt.toISOString().slice(0, 10),
                s.code ?? "",
                s.channelAccount.channel.name,
                s.iptalTarihi === null ? "" : "IPTAL",
                s.profitStatus ?? "",
                s.net2Amount === null ? "" : String(s.net2Amount),
                ciro.toFixed(2),
                d === undefined ? "" : d.deger.toFixed(2),
              ].join(";");
            }),
        ),
      ].join("\r\n"),
    "utf8",
  );
  console.log(`\n   ⭐ TAM LİSTE: ${cikti} (gitignore'da)`);

  console.log("\n" + "-".repeat(88));
  console.log("  ⛔ HÜKÜM SINIRI. (c) kovası bir KUSUR DEĞİL — sistem o");
  console.log("     siparişlerin kargosunu gerçekten bilmiyor ve boş");
  console.log("     bırakmak bunu SÖYLÜYOR. Kusur (a) kovasındadır.");
  console.log("=".repeat(88) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
