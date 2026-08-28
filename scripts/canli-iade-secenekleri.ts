import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE İÇE AKTARMA — ÜÇ SEÇENEK + İPTAL KURU KOŞUMU (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iade-secenekleri
 *
 *  ⭐ ÖNCEKİ RAPORUM EKSİKTİ VE DÜZELTİLİYOR: "iki alan eksik (reason ve
 *  returnType)" demiştim. Şema okundu — **`Return` modelinde `reason`
 *  alanı HİÇ YOK.** `reason` yalnız `ReturnNotice`ta yaşıyor ve o, malın
 *  GELMESİNİ bekleyen aşamanın kaydı. Bu iadelerde mal çoktan geldi ve
 *  süreç bitti; `ReturnNotice` yazmak zaten yanlış olurdu.
 *
 *  ⛔ YANİ EKSİK ALAN İKİ DEĞİL, BİR: `returnType`.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(14);

/**
 * ⭐ HALİL DOĞRULADI 28.08.2026 — dosyanın TÜR sütunu tek başına hüküm
 * vermiyor. Ölçüm "5 iptal" demişti; Halil ayırdı: **4 iptal + 1 iade.**
 * `4619254455` bir İADEDİR — satış gerçekleşti, mal döndü. İptal yazmak
 * satışı hiç olmamış gibi gösterirdi.
 */
const IPTAL_EDILECEK = ["4234503772", "4597407440", "4852324050", "4002405216"];
const IADE_OLAN = "4619254455";

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  // ═══ ① İPTAL KURU KOŞUMU ════════════════════════════════════════════════
  console.log("\n" + "=".repeat(104));
  console.log("① İPTAL KURU KOŞUMU — 4 satış (Halil doğruladı)");
  console.log("=".repeat(104));
  const iptalSatis = await p.sale.findMany({
    where: { code: { in: IPTAL_EDILECEK } },
    select: { id: true, code: true, soldAt: true, iptalTarihi: true, profitStatus: true,
      net1Amount: true, net2Amount: true,
      items: { select: { quantity: true, unitPriceAmount: true,
        stockMovements: { select: { type: true, quantityDelta: true } } } } },
  });
  let ciro = 0, net2 = 0, hareket = 0;
  for (const x of iptalSatis) {
    const c2 = x.items.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
    ciro += c2;
    net2 += Number(x.net2Amount?.toString() ?? 0);
    hareket += x.items.reduce((t, k) => t + k.stockMovements.length, 0);
    console.log("   " + x.code + "  " + x.soldAt.toISOString().slice(0, 10) +
      "  ciro " + c2.toFixed(2).padStart(9) +
      "  NET-2 " + (x.net2Amount?.toString() ?? "—").padStart(10) +
      "  durum " + x.profitStatus +
      "  stok hareketi " + x.items.reduce((t, k) => t + k.stockMovements.length, 0) +
      (x.iptalTarihi ? "  ⚠ ZATEN İPTAL" : ""));
  }
  console.log("\n   düşecek CİRO  : " + t2(ciro));
  console.log("   düşecek NET-2 : " + t2(net2));
  console.log("   ilgili stok hareketi: " + hareket);
  console.log("\n   ⚠ KÂR TAZELEMESİ GEREKİR Mİ: HAYIR. İptal, kârı yeniden");
  console.log("     HESAPLAMAZ — `iptalTarihi` dolunca satış bütün süzgeçlerden");
  console.log("     DÜŞER (ciro · NET · hakediş). Kayıt olduğu yerde durur,");
  console.log("     yalnız sayılmaz. _(Anayasa: iptal 'düşülmez', HİÇ DOĞMAMIŞ")
  console.log("     sayılır.)_");
  console.log("\n   ⚠ STOK: iptal edilen satışın malı GERİ DÖNER. Bu betik");
  console.log("     stoğa dokunmayacak; iptal akışı (`satislar` ekranı) kendi");
  console.log("     ayna hareketini yazar. Toplu iptal yazılacaksa o akışın");
  console.log("     gövdesi kullanılmalı — ikinci bir iptal mantığı YAZILMAZ.");

  const iade = await p.sale.findFirst({
    where: { code: IADE_OLAN },
    select: { code: true, soldAt: true, profitStatus: true, net2Amount: true },
  });
  console.log("\n   ⛔ İPTAL EDİLMEYECEK: " + IADE_OLAN + " — Halil: BU BİR İADE.");
  if (iade) {
    console.log("     " + iade.soldAt.toISOString().slice(0, 10) + " · durum " +
      iade.profitStatus + " · NET-2 " + (iade.net2Amount?.toString() ?? "—"));
  }
  console.log("     Satış gerçekleşti, mal döndü. İptal yazmak satışı HİÇ");
  console.log("     OLMAMIŞ gibi gösterirdi. 243'lük iade kovasına ait.");

  // ═══ ② ÜÇ SEÇENEK ═══════════════════════════════════════════════════════
  const s = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);
  const iadeSatir = s.data.slice(1).filter((r) =>
    String(r[i("TÜR")] ?? "").trim() === "iade");

  console.log("\n\n" + "=".repeat(104));
  console.log("② İADE İÇE AKTARMA — ŞEMA GERÇEĞİ ÖNCE");
  console.log("=".repeat(104));
  console.log("\n   `Return` ZORUNLU     : saleId ✓ · returnType ⛔ · occurredAt ✓");
  console.log("   `ReturnItem` ZORUNLU : saleItemId ✓ · variantId ✓ · quantity ✓");
  console.log("   ⭐ `Return`da `reason` ALANI YOK — o yalnız `ReturnNotice`ta,");
  console.log("     ve o model malın GELMESİNİ bekleyen aşamanın kaydı.");
  console.log("     Bu iadelerde süreç BİTMİŞ; bildirim yazmak yanlış olurdu.");
  console.log("\n   ⛔ EKSİK ALAN İKİ DEĞİL, BİR: `returnType`");
  console.log("      UNDELIVERED (teslim edilemeden döndü) · NORMAL (müşteri");
  console.log("      aldı, iade etti) · DISPUTED (geç itiraz)");

  /** ⚠ Dosyada tür için İPUCU var mı — kargo sütunu. */
  const kargolu = iadeSatir.filter((r) => Math.abs(n(r[i("KARGO")])) > 0);
  console.log("\n   DOSYADA TÜR İPUCU ARANDI:");
  console.log("     KARGO sütunu dolu (≠0) : " + kargolu.length + " / " + iadeSatir.length);
  console.log("     ⚠ Kargo yazılı olması NORMAL iadeye işaret EDEBİLİR (dönüş");
  console.log("       kargosu satıcıda) ama bu bir TAHMİNDİR, ölçüm değil.");
  console.log("       `UNDELIVERED`da da gidiş kargosu yanmış olabilir.");
  console.log("     ⛔ Bu ipucuyla tür ATANMAZ — kargo maliyetini değiştirir.");

  const tutar = iadeSatir.reduce((t, r) => t + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])), 0);
  console.log("\n   ═══ ÜÇ SEÇENEK ═══");
  console.log("\n   A) HİÇ AKTARMA");
  console.log("      kazanç : sıfır risk, hiçbir uydurma yok");
  console.log("      kayıp  : ciro ₺694.432 FAZLA kalır · kalıcı şerh");
  console.log("      iş yükü: YOK");
  console.log("      ⚠ Bu bir SEÇENEKTİR, 'yapamadık' değil — bedeli net.");

  console.log("\n   B) TÜRSÜZ AKTARMA — ⛔ ŞEMA İZİN VERMİYOR");
  console.log("      `returnType` NOT NULL bir enum. `null` yazılamaz.");
  console.log("      Yapılabilecek tek şey bir değeri VARSAYMAK olurdu ve o");
  console.log("      varsayım KARGO MALİYETİNİ değiştirir (iade-sureci §5).");
  console.log("      ⭐ AMA MERDİVEN İNİLİRSE: `Return.note` serbest metin ve");
  console.log("        `code` alanı boş. Tür BİLİNMİYOR olarak işaretlenip");
  console.log("        kargo hesabı DIŞINDA bırakılabilir — yeni sütun");
  console.log("        açmadan. Bu bir öneri, karar kullanıcının.");

  const sinir = new Date(Date.now() - 90 * 86400_000);
  const son90 = iadeSatir.filter((r) => {
    const d = r[i("Tarih")];
    const t = d instanceof Date ? d : new Date(String(d));
    return !Number.isNaN(t.getTime()) && t >= sinir;
  });
  console.log("\n   C) KISMİ — son 90 gün elle");
  console.log("      kapsam : " + son90.length + " kayıt · " +
    t2(son90.reduce((t, r) => t + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])), 0)));
  console.log("      ciroyu düzeltme oranı: %" +
    ((son90.reduce((t, r) => t + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])), 0) / tutar) * 100).toFixed(1));
  console.log("      iş yükü: " + son90.length + " satır × tür seçimi");

  // ═══ ③ tazmin / Zarar ═══════════════════════════════════════════════════
  console.log("\n\n" + "=".repeat(104));
  console.log("③ `tazmin` ve `Zarar` TÜRLERİ — sistemdeki karşılığı");
  console.log("=".repeat(104));
  const ss = (await readXlsxFile(paketiNormalle(readFileSync("C:/Users/yapra/Desktop/excel/satis.xlsx")).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sb = ss.data[5].map((h) => String(h ?? "").trim());
  const sj = (a: string) => sb.indexOf(a);
  const turler = new Map<string, { n: number; tutar: number }>();
  for (const r of ss.data.slice(6)) {
    const t = String(r[sj("TÜR")] ?? "").trim();
    if (t === "") continue;
    const v = turler.get(t) ?? { n: 0, tutar: 0 };
    v.n++; v.tutar += Math.abs(n(r[sj("ÜRÜN LİSTE FİYATI")]));
    turler.set(t, v);
  }
  console.log("\n   DOSYADAKİ BÜTÜN TÜRLER:");
  for (const [t, v] of [...turler].sort((a, b) => b[1].n - a[1].n)) {
    console.log("     " + t.padEnd(14) + String(v.n).padStart(6) + t2(v.tutar));
  }
  const comp = await p.compensation.count();
  console.log("\n   SİSTEMDEKİ KARŞILIK:");
  console.log("     `Compensation` kaydı : " + comp);
  console.log("     ⚠ `tazmin` muhtemelen kargo/pazaryeri tazminatı → `Compensation`");
  console.log("     ⚠ `Zarar` için sistemde doğrudan bir tür YOK — hurda/imha");
  console.log("       olabilir; ölçülmeden eşleştirilmez.");
  console.log("   ⛔ İKİSİ DE AYRI KALEM, bu turda İŞLENMEZ.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
