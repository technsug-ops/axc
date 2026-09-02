/**
 * ============================================================================
 *  K136b — TY GEÇMİŞ ÇEKİMİ FİZİBİLİTESİ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ty-gecmis-fizibilite
 *
 *  BETIK SINIFI: TEK_SEFERLIK — kapsam raporu. ⛔ HİÇBİR ŞEY YAZMAZ;
 *  tek çağrı noktası `scripts/ty/istemci.ts` ve o modül YALNIZ `GET` bilir.
 *
 *  ── ŞARTNAME (Halil, 02.09.2026) ────────────────────────────────────────
 *  _"Sıra B'de = TY hakediş GEÇMİŞ çekimi + claims geçmiş ufku, tek
 *  fizibilite raporu (salt okuma, Halil makinesi, A3 içinde)."_
 *
 *  ── ⛔ CEVAPLANACAK SORU TEK: AÇIĞIN NE KADARI BU BORUYLA KAPANIR ───────
 *  İade açığı 225 sipariş · ₺651.756,47 — HB ₺332.252,97 / TY ₺319.503,50.
 *  HB'de API kapısı açılmadı, yani bu boru **en fazla TY yarısını** kapatır.
 *  Ama "en fazla yarısı" bir TAVANDIR, ölçüm değil. Gerçek sayı: claims
 *  ucunun açıktaki TY siparişlerinin KAÇINI gördüğü.
 *
 *  ⚠ VE ÜÇ AYRI SIFIR AYRI SAYILIR:
 *    (a) claims'te var, defterde satış YOK        → başka iş
 *    (b) claims'te YOK                            → bu boru göremez
 *    (c) claims'te VAR ve satış VAR               → ⭐ YAZILABİLİR
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir".)_
 * ============================================================================
 */

import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, apiGet, baslikKur, kimlikOku } from "./ty/istemci";
import { paketiNormalle } from "../src/lib/tablo/paket";

/** Kullanıcının ters satır listesi — `canli-iade-acigi.ts` ile AYNI dosya. */
const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";

function gun(ms: number | Date): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function oku(x: unknown, yol: string[]): unknown {
  let g: unknown = x;
  for (const p of yol) {
    if (g === null || typeof g !== "object") return undefined;
    g = (g as Record<string, unknown>)[p];
  }
  return g;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const k = kimlikOku();
  if (k === null) {
    console.log("⛔ TY kimliği okunamadı — ÖLÇÜM YOK ('erişim yok' DEMEK DEĞİL).");
    process.exitCode = 1;
    return;
  }
  const baslik = baslikKur(k);
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("=".repeat(84));
  console.log("  K136b — TY GEÇMİŞ ÇEKİMİ FİZİBİLİTESİ (salt okuma, GET)");
  console.log("=".repeat(84));

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ① CLAIMS UFKU — kaç kayıt, hangi tarihe kadar
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n① CLAIMS UCU — ufuk ve tamlık");
  const claims: unknown[] = [];
  let claimBeklenen: number | null = null;
  for (let sayfa = 0; sayfa < 40; sayfa++) {
    const s = await apiGet(UCLAR.iadeler(k.saticiId, sayfa, 50), baslik, 90_000);
    if (s.tur !== "VERI") {
      console.log(`   ⛔ sayfa ${sayfa}: ${s.tur === "ULASILAMADI" ? s.sebep : s.tur}`);
      break;
    }
    const g = s.govde as Record<string, unknown>;
    if (sayfa === 0 && typeof g.totalElements === "number") {
      claimBeklenen = g.totalElements;
    }
    const dizi = Array.isArray(g.content) ? (g.content as unknown[]) : [];
    if (dizi.length === 0) break;
    claims.push(...dizi);
    const tp = typeof g.totalPages === "number" ? g.totalPages : null;
    if (tp !== null && sayfa + 1 >= tp) break;
  }
  console.log(`   çekilen ${claims.length} claim`);
  if (claimBeklenen !== null) {
    console.log(
      `   ucun kendi beyanı ${claimBeklenen}` +
        (claims.length === claimBeklenen
          ? "  ✓ TAM"
          : `  ⛔ EKSİK — liste ALT SINIRDIR`),
    );
  }
  const claimTarihleri = claims
    .map((c) => oku(c, ["claimDate"]))
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  if (claimTarihleri.length > 0) {
    console.log(
      `   ufuk: ${gun(claimTarihleri[0])} → ${gun(claimTarihleri[claimTarihleri.length - 1])}`,
    );
  }
  /** Sipariş numarasına göre claim haritası — kimlikle, dizeyle DEĞİL. */
  const claimSiparisleri = new Set(
    claims
      .map((c) => oku(c, ["orderNumber"]))
      .filter((v) => v !== undefined && v !== null)
      .map((v) => String(v).trim()),
  );
  console.log(`   farklı sipariş numarası: ${claimSiparisleri.size}`);

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ② HAKEDİŞ UCU — GEÇMİŞE NE KADAR İNİYOR
   * ---------------------------------------------------------------------
   *  Pencere en fazla 15 GÜN (uç kendi mesajıyla söylüyor). Geriye doğru
   *  giderek İLK BOŞ/HATA veren pencereyi arıyoruz.
   *
   *  ⚠ "BOŞ" İLE "HATA" AYRI SAYILIR: boş pencere "o dönemde hareket yok"
   *  demek olabilir; hata "erişim yok" demektir. İkisi karıştırılırsa ufuk
   *  yanlış ölçülür.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n② HAKEDİŞ UCU — geçmiş ufku (15 günlük pencereler, geriye)");
  const GUN_MS = 86_400_000;
  const bugun = Date.now();
  let enEskiVeri: number | null = null;
  let ardArdaBos = 0;
  /** Döngü tavanı — 60 × 15 gün ≈ 2,5 yıl. AŞILIRSA SÖYLENİR. */
  const TAVAN = 60;
  let tavanaDayandi = true;
  for (let i = 0; i < TAVAN; i++) {
    const son = bugun - i * 15 * GUN_MS;
    const bas = son - 15 * GUN_MS;
    /**
     * ⛔ `size` 500 OLMAK ZORUNDA — VE BUNU UCUN KENDİSİ SÖYLEDİ.
     * İlk denemede 50 geçtim, uç `400` döndü ve ben mesajı 80 karaktere
     * kırptığım için sebep GÖRÜNMEDİ ("CheApiBusinessException" ile
     * kesildi). Tam mesaj: _"Size değeri 500 ya da 1000 olmalıdır"_.
     * Kırpma olmasaydı ilk turda çözülürdü.
     * _(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır".)_
     */
    const s = await apiGet(
      UCLAR.hakedis(k.saticiId, bas, son, 0, 500),
      baslik,
      90_000,
    );
    if (s.tur !== "VERI") {
      console.log(
        `   ${gun(bas)} → ${gun(son)}   ⛔ ${
          s.tur === "ULASILAMADI" ? s.sebep : s.tur
        }`,
      );
      /**
       * ⛔ MESAJ TAM BASILIYOR — İLK YAZIMDA 80 KARAKTERE KIRPMIŞTIM ve
       * ucun ne dediği görünmedi ("CheApiBusinessException" ile kesildi).
       * Kırpma yalnız GÖSTERİMDE yapılır, teşhiste ASLA.
       * _(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır".)_
       */
      if (s.tur === "ISTEK_HATALI") {
        console.log(`   UCUN TAM CEVABI: ${s.mesaj}`);
      }
      console.log("   ⚠ HATA = 'erişim yok' DEĞİL: 400 demek UÇ AYAKTA,");
      console.log("     parametre BİZDE yanlış. Ufuk ÖLÇÜLEMEDİ.");
      break;
    }
    const g = s.govde as Record<string, unknown>;
    const adet =
      typeof g.totalElements === "number"
        ? g.totalElements
        : Array.isArray(g.content)
          ? (g.content as unknown[]).length
          : 0;
    if (adet > 0) {
      enEskiVeri = bas;
      ardArdaBos = 0;
      if (i % 4 === 0 || i < 3) {
        console.log(`   ${gun(bas)} → ${gun(son)}   ${adet} kayıt`);
      }
    } else {
      ardArdaBos += 1;
      if (ardArdaBos === 1) console.log(`   ${gun(bas)} → ${gun(son)}   BOŞ`);
      /**
       * ⚠ ART ARDA 6 BOŞ PENCERE (~3 ay) = ufuk bitti sayılıyor. Tek boş
       * pencere hüküm değil: sezon dışı bir dönem de boş olabilir.
       */
      if (ardArdaBos >= 6) {
        console.log(`   … art arda ${ardArdaBos} boş pencere — durduruldu`);
        tavanaDayandi = false;
        break;
      }
    }
  }
  /**
   * ⛔ "EN ESKİ" DEĞİL, "GİTTİĞİM EN ESKİ" — İKİSİ AYNI ŞEY DEĞİL.
   * Döngü tavanına dayandıysak uç DAHA GERİYE de veriyor olabilir; bunu
   * "ufuk burada bitiyor" diye yazmak, aracımın sınırını kaynağın sınırı
   * sanmaktır — aynı gün iki kez düştüğüm tuzak (zaman aşımı · alan
   * haritası derinliği).
   */
  if (enEskiVeri === null) {
    console.log("   ⛔ HİÇ HAKEDİŞ KAYDI GELMEDİ — ufuk ölçülemedi.");
  } else if (tavanaDayandi) {
    console.log(
      `   ⭐ veri geldi, GİDİLEBİLEN EN ESKİ pencere: ${gun(enEskiVeri)}`,
    );
    console.log(
      `   ⚠ DÖNGÜ TAVANINA DAYANDI (${TAVAN} pencere) — uç DAHA GERİYE de`,
    );
    console.log("     veriyor olabilir. Bu ARACIN sınırı, ucun değil.");
  } else {
    console.log(`   ⭐ ufuk BURADA bitiyor: ${gun(enEskiVeri)}`);
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ③ AÇIK TY SİPARİŞLERİ ↔ CLAIMS — ASIL SORU
   * ---------------------------------------------------------------------
   *  ⚠ AÇIK KÜMESİ `canli-iade-acigi.ts` İLE AYNI ÖLÇÜTTEN kuruluyor:
   *  satış VAR · iptal DEĞİL · sistemde `Return` ya da `ReturnNotice` YOK.
   *  İki rapor aynı soruya iki cevap veremez.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n③ AÇIK TY SİPARİŞLERİ ↔ CLAIMS");
  const sayfaVerisi = (
    await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt)
  )[0] as unknown as { data: unknown[][] };
  const veri = sayfaVerisi.data;
  const baslikSatiri = (veri[0] ?? []).map((c) => String(c ?? "").trim());
  const iNo = baslikSatiri.indexOf("Sipariş Numarası");
  if (iNo < 0) {
    console.log("   ⛔ 'Sipariş Numarası' sütunu bulunamadı — ÖLÇÜM YOK.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const nolar = [
    ...new Set(
      veri
        .slice(1)
        .map((r) => String(r[iNo] ?? "").trim())
        .filter((x) => x !== ""),
    ),
  ];

  const satislar = new Map<
    string,
    { id: string; iptal: Date | null; kanal: string; ciro: number }
  >();
  for (let a = 0; a < nolar.length; a += 400) {
    for (const x of await prisma.sale.findMany({
      where: { code: { in: nolar.slice(a, a + 400) } },
      select: {
        id: true,
        code: true,
        iptalTarihi: true,
        channelAccount: { select: { channel: { select: { name: true } } } },
        items: { select: { quantity: true, unitPriceAmount: true } },
      },
    })) {
      satislar.set(x.code!, {
        id: x.id,
        iptal: x.iptalTarihi,
        kanal: x.channelAccount.channel.name,
        ciro: x.items.reduce(
          (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
          0,
        ),
      });
    }
  }
  const bildirimli = new Set(
    (
      await prisma.returnNotice.findMany({
        where: { sale: { code: { in: nolar } } },
        select: { sale: { select: { code: true } } },
      })
    ).map((x) => x.sale.code!),
  );
  const iadeli = new Set(
    (
      await prisma.return.findMany({
        where: { sale: { code: { in: nolar } } },
        select: { sale: { select: { code: true } } },
      })
    ).map((x) => x.sale.code!),
  );

  const acikTy = nolar.filter((no) => {
    const s = satislar.get(no);
    return (
      s !== undefined &&
      s.iptal === null &&
      !bildirimli.has(no) &&
      !iadeli.has(no) &&
      s.kanal === "Trendyol"
    );
  });

  const goren = acikTy.filter((no) => claimSiparisleri.has(no));
  const gormeyen = acikTy.filter((no) => !claimSiparisleri.has(no));
  const gorenCiro = goren.reduce((t, no) => t + (satislar.get(no)?.ciro ?? 0), 0);
  const gormeyenCiro = gormeyen.reduce(
    (t, no) => t + (satislar.get(no)?.ciro ?? 0),
    0,
  );

  console.log(`   açık TY siparişi          : ${acikTy.length}`);
  console.log(
    `   ⭐ claims'te GÖRÜNEN      : ${goren.length}   ciro ${para(gorenCiro)}`,
  );
  console.log(
    `   ⛔ claims'te GÖRÜNMEYEN   : ${gormeyen.length}   ciro ${para(gormeyenCiro)}`,
  );
  if (acikTy.length > 0) {
    console.log(
      `   kapsama                   : %${((goren.length / acikTy.length) * 100).toFixed(1)}`,
    );
  }
  if (goren.length > 0) {
    console.log(`   örnek (görünen): ${goren.slice(0, 8).join(" · ")}`);
  }

  /** (a) kovası — claims'te var ama defterde satış yok. */
  const defterdeYok = [...claimSiparisleri].filter(
    (no) => !satislar.has(no) && nolar.includes(no),
  );
  console.log(
    `   (a) claims'te var, listede var, DEFTERDE SATIŞ YOK: ${defterdeYok.length}`,
  );

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ④ TÜR TÜRETİLEBİLİR Mİ — YAZIMIN ÖNÜNDEKİ SON KAPI
   * ---------------------------------------------------------------------
   *  K136a'da her sipariş için ÜÇ şey gerekti: sebep · tarih · tür.
   *  Claims ilk ikisini veriyor. Tür için hipotez şu:
   *
   *    "Claims bir MÜŞTERİ TALEBİDİR; talep açabilmek için malı almış
   *     olmak gerekir. O hâlde claims'teki her kayıt NORMAL'dir."
   *
   *  ⛔ HİPOTEZ TEK BAŞINA KANIT DEĞİL — ve K136a'nın 8 kaydı bunu
   *  SINAYAMAZ, çünkü sekizi de NORMAL: ayrımın iki yakası yok.
   *  _(Anayasa: "örnek veri ayrımın iki yakasını göstermeli".)_
   *
   *  ⭐ AYIRT EDİCİ KANIT İKİ YERDE ARANIYOR:
   *    · sebep kodlarının dağılımı — "teslim edilemedi / kargo iade"
   *      anlamına gelen BİR TANE bile varsa hipotez ÇÜRÜR;
   *    · kendi defterimiz — `UNDELIVERED` kaydımız claims'te GÖRÜNÜYORSA
   *      hipotez ÇÜRÜR.
   *  Hiçbiri çürütmezse sonuç "kanıtlandı" değil **"çürütülemedi"**dir.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n④ TÜR TÜRETİLEBİLİR Mİ — sebep kodu dağılımı");
  const kodSayaci = new Map<string, number>();
  const durumSayaci = new Map<string, number>();
  for (const c of claims) {
    for (const it of ((oku(c, ["items"]) as unknown[]) ?? [])) {
      for (const ci of ((oku(it, ["claimItems"]) as unknown[]) ?? [])) {
        const kod = String(oku(ci, ["customerClaimItemReason", "code"]) ?? "—");
        const ad = String(oku(ci, ["customerClaimItemReason", "name"]) ?? "—");
        const anahtar = `${kod} · ${ad}`;
        kodSayaci.set(anahtar, (kodSayaci.get(anahtar) ?? 0) + 1);
        const d = String(oku(ci, ["claimItemStatus", "name"]) ?? "—");
        durumSayaci.set(d, (durumSayaci.get(d) ?? 0) + 1);
      }
    }
  }
  console.log("   SEBEP KODLARI (kalem sayısı):");
  for (const [ad, n] of [...kodSayaci.entries()].sort((x, z) => z[1] - x[1])) {
    console.log(`      ${String(n).padStart(4)}  ${ad}`);
  }
  console.log("   TALEP DURUMLARI:");
  for (const [ad, n] of [...durumSayaci.entries()].sort((x, z) => z[1] - x[1])) {
    console.log(`      ${String(n).padStart(4)}  ${ad}`);
  }

  /** ⭐ İKİNCİ TANIK — KENDİ DEFTERİMİZ, claims'ten BAĞIMSIZ kaynak. */
  const undelivered = await prisma.return.findMany({
    where: { returnType: "UNDELIVERED" },
    select: { occurredAt: true, sale: { select: { code: true } } },
  });
  console.log(`\n   defterdeki UNDELIVERED iade: ${undelivered.length}`);
  if (undelivered.length === 0) {
    console.log("   ⚠ ÖRNEK YOK → hipotez BU TARAFTAN sınanamadı.");
    console.log("     'Sınanamadı' ile 'doğrulandı' AYNI ŞEY DEĞİLDİR.");
  } else {
    let claimsteVar = 0;
    for (const u of undelivered) {
      const kod = u.sale?.code ?? "";
      const varMi = claimSiparisleri.has(kod);
      if (varMi) claimsteVar += 1;
      console.log(
        `      ${kod.padEnd(14)} ${gun(u.occurredAt)}  claims'te ${varMi ? "⛔ VAR" : "✓ YOK"}`,
      );
    }
    console.log(
      claimsteVar > 0
        ? `   ⛔ HİPOTEZ ÇÜRÜDÜ: ${claimsteVar} UNDELIVERED kayıt claims'te DE var.`
        : "   ✓ HİPOTEZ ÇÜRÜTÜLEMEDİ: UNDELIVERED kayıtların hiçbiri claims'te yok.",
    );
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ⑤ AÇIK 114 SİPARİŞİN YAZIMA HAZIRLIĞI
   * ---------------------------------------------------------------------
   *  ⭐ HİPOTEZ ÇÜRÜDÜ — VE CEVAP HİPOTEZDEN İYİ ÇIKTI.
   *  "Claims'teki her kayıt NORMAL'dir" yanlıştı: kodlar arasında
   *  `UNDELIVERED · Teslim edilemeyen gönderi` (25 kalem) ve
   *  `CLAIMEDINSHIP · Taşıma Sürecinde İade Edildi` (3 kalem) VAR.
   *
   *  Yani tür VARSAYILMIYOR — **kanalın kendi kodundan OKUNUYOR.** Bu,
   *  varsaymaktan çok daha sağlam bir yol: K136a'da ekstrenin `KARGO_IADE`
   *  satırından türetiyorduk ve TY ekstresinde o satır hiç yoktu.
   *
   *  ⚠ VE DURUM SÜZGECİ ŞART: 351 talebin 235'i `Accepted`, 70'i
   *  `Cancelled`, 53'ü `Rejected`, 1'i `Created`. Reddedilen bir talep
   *  İADE DEĞİLDİR (mal müşteride kaldı); iptal edilen de öyle.
   *  K136a'da `11409234590`'ın İKİ talebi vardı ve doğru olan `Accepted`
   *  olandı — süzgeç orada elle uygulanmıştı, burada ölçülüyor.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n⑤ AÇIK 114 SİPARİŞİN YAZIMA HAZIRLIĞI");
  /** Teslim EDİLMEMİŞ anlamına gelen kodlar — kanalın kendi sözlüğünden. */
  const TESLIM_EDILMEDI = new Set(["UNDELIVERED", "CLAIMEDINSHIP"]);
  const gorenKume = new Set(goren);
  /**
   * ⛔ BİRİM SİPARİŞTİR, TALEP DEĞİL — VE İLK YAZIMDA KARIŞTIRDIM.
   * Sayaçlar talep başına artıyordu ve özet `114 + 17 = 131 > 114` dedi:
   * bir siparişin BİRDEN ÇOK talebi olabiliyor (`10519323917` üç kez
   * geçti). Doğru sayım kimlik KÜMESİYLE yapılır.
   * _(Anayasa: "bir sayı etiketiyle taşınır; birim de etikettir".)_
   */
  const kabulluSiparis = new Set<string>();
  const siparisTuru = new Map<string, Set<string>>();
  for (const c of claims) {
    const no = String(oku(c, ["orderNumber"]) ?? "").trim();
    if (!gorenKume.has(no)) continue;
    for (const it of ((oku(c, ["items"]) as unknown[]) ?? [])) {
      for (const ci of ((oku(it, ["claimItems"]) as unknown[]) ?? [])) {
        if (String(oku(ci, ["claimItemStatus", "name"]) ?? "") !== "Accepted") {
          continue;
        }
        kabulluSiparis.add(no);
        const kod = String(oku(ci, ["customerClaimItemReason", "code"]) ?? "—");
        const tur = TESLIM_EDILMEDI.has(kod) ? "UNDELIVERED" : "NORMAL";
        const g = siparisTuru.get(no) ?? new Set<string>();
        g.add(tur);
        siparisTuru.set(no, g);
      }
    }
  }
  const kabulsuz = goren.filter((no) => !kabulluSiparis.has(no));
  console.log(
    `   ⭐ 'Accepted' talebi OLAN sipariş : ${kabulluSiparis.size}/${goren.length}`,
  );
  console.log(
    `   ⛔ hiç 'Accepted' talebi YOK      : ${kabulsuz.length}` +
      (kabulsuz.length > 0 ? `   ${kabulsuz.slice(0, 6).join(" · ")}` : ""),
  );
  console.log("     (reddedilen/iptal edilen talep İADE DEĞİLDİR — yazılmaz)");
  const kapsanan = kabulluSiparis.size + kabulsuz.length;
  if (kapsanan !== goren.length) {
    console.log(`   ⛔ KOVA TOPLAMI ${kapsanan} ≠ ${goren.length} — sayım hatalı.`);
    process.exitCode = 1;
  }

  /**
   * ⚠ KARIŞIK TÜR AYRI SAYILIYOR: bir siparişte hem `UNDELIVERED` hem
   * `NORMAL` kabul edilmiş kalem varsa tür TEK BAŞINA okunamaz — o kayıt
   * toplu yazıma giremez, elle bakılır. Sessizce birini seçmek, kargo
   * maliyetini yanlış yazmak demektir.
   */
  let sadeceNormal = 0;
  let sadeceUndelivered = 0;
  const karisik: string[] = [];
  for (const [no, kume] of siparisTuru) {
    if (kume.size > 1) karisik.push(no);
    else if (kume.has("UNDELIVERED")) sadeceUndelivered += 1;
    else sadeceNormal += 1;
  }
  console.log("   TÜR (SİPARİŞ bazında, kanalın kodundan OKUNDU):");
  console.log(`      ${String(sadeceNormal).padStart(4)}  NORMAL`);
  console.log(`      ${String(sadeceUndelivered).padStart(4)}  UNDELIVERED`);
  console.log(
    `      ${String(karisik.length).padStart(4)}  ⛔ KARIŞIK — elle bakılır` +
      (karisik.length > 0 ? `   ${karisik.slice(0, 6).join(" · ")}` : ""),
  );

  console.log("\n" + "=".repeat(84));
  console.log("  HÜKÜM SINIRI");
  console.log("=".repeat(84));
  console.log("  Bu rapor claims ucunun açıktaki TY siparişlerini NE KADAR");
  console.log("  gördüğünü söyler. 'Görünen' demek 'yazılabilir' demek");
  console.log("  DEĞİLDİR — tür ve tarih K136a'daki gibi ayrıca çözülmeli.");
  console.log("  ⛔ HB yarısı (₺332.252,97) bu boruyla KAPANMIYOR.");
  console.log("  ⛔ YAZIM YOK. Toplu yazım AYRI onayla.");
  console.log("=".repeat(84) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
