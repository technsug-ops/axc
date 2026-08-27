import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  MARJ ÇARPITMASI + DOSYANIN KOMİSYON KOLONU — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:marj-carpitmasi
 *
 *  ⭐ BULGU: marj şerhi MALİYET BAĞINI ölçüyor, komisyon oranını değil.
 *  `ice-aktarma-serhi.ts:303-315` şunu yapıyor:
 *
 *      net        = Σ sale.net2Amount        (null olan HİÇ katkı vermez)
 *      ciroBagli  = maliyet bağı OLAN kalemlerin cirosu
 *      baglıMarj  = net / ciroBagli
 *
 *  Maliyet bağı VAR ama komisyon oranı YOK olan bir kalem:
 *    · PAYDAYA giriyor (cirosu sayılıyor)
 *    · PAYA girmiyor  (`net2Amount` null, çünkü `RULE_MISSING`)
 *
 *  ⛔ Yani marj SİSTEMATİK OLARAK OLDUĞUNDAN DÜŞÜK. Ve şerh bunu
 *  söylemiyor: onun ölçtüğü kapsam "maliyeti olmayan ciro"; bu kalemlerin
 *  maliyeti VAR, o yüzden şerh onları "kapsanan" sayıyor.
 *
 *  ⛔ HÜKÜM YOK — çarpıtmanın BÜYÜKLÜĞÜ ölçülüyor, düzeltme önerilmiyor.
 * ============================================================================
 */

const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";
const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (n: number) => n.toFixed(2).padStart(15);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(104));
  console.log("① MARJ ÇARPITMASININ BÜYÜKLÜĞÜ");
  console.log("=".repeat(104));

  const girisli = new Set(
    (await p.stockMovement.findMany({
      where: { saleItemId: { not: null } },
      select: { saleItemId: true },
    })).map((h) => h.saleItemId!),
  );

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: {
      id: true, commissionRate: true, quantity: true, unitPriceAmount: true,
      sale: { select: { id: true, net2Amount: true, profitStatus: true } },
    },
  });

  let ciroBagli = 0;
  let ciroBagliOranVar = 0;
  let ciroBagliOranYok = 0;
  /** ⚠ PAY ile PAYDA AYNI KÜMEDEN — eşleşmemiş kıyas anlamsız sayı üretir. */
  const netSatis = new Map<string, number>();
  const ciroNetliSatis = new Map<string, number>();
  for (const k of kalemler) {
    const ciro = Number(k.unitPriceAmount.toString()) * k.quantity;
    if (k.sale.net2Amount !== null) {
      netSatis.set(k.sale.id, Number(k.sale.net2Amount));
      ciroNetliSatis.set(k.sale.id, (ciroNetliSatis.get(k.sale.id) ?? 0) + ciro);
    }
    if (!girisli.has(k.id)) continue;
    ciroBagli += ciro;
    if (k.commissionRate === null) ciroBagliOranYok += ciro;
    else ciroBagliOranVar += ciro;
  }
  const net = [...netSatis.values()].reduce((t, x) => t + x, 0);
  const ciroNetli = [...ciroNetliSatis.values()].reduce((t, x) => t + x, 0);

  console.log("\n   maliyet bağı OLAN ciro (şerhin paydası) : " + t2(ciroBagli));
  console.log("     · komisyon oranı VAR  : " + t2(ciroBagliOranVar) +
    "   (" + ((ciroBagliOranVar / ciroBagli) * 100).toFixed(1) + "%)");
  console.log("     · komisyon oranı YOK  : " + t2(ciroBagliOranYok) +
    "   (" + ((ciroBagliOranYok / ciroBagli) * 100).toFixed(1) + "%)  ⭐");
  console.log("   Σ net2Amount (şerhin payı)              : " + t2(net));

  /**
   * ⛔ İLK YAZIMIM KUSURLUYDU VE SİLİNMİYOR: payı `Σ net2Amount`, paydayı
   * "komisyon oranı olan kalemlerin cirosu" alıp bölmüştüm ve **%121**
   * çıkmıştı — imkânsız bir marj. Sebep: iki taraf AYNI KÜMEDEN gelmiyordu.
   * Pay, NET'i hesaplanmış SATIŞLARIN toplamıydı; payda ise oranı olan
   * KALEMLERİN cirosu. _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli".)_
   */
  const marjEkran = (net / ciroBagli) * 100;
  const marjEslesmis = (net / ciroNetli) * 100;
  console.log("\n   EKRANDAKİ 'bağlı marj'  = net / ciroBağlı            = " + marjEkran.toFixed(2) + "%");
  console.log("   EŞLEŞMİŞ KÜME           = net / (o satışların cirosu) = " + marjEslesmis.toFixed(2) + "%");
  console.log("     · eşleşmiş küme: " + netSatis.size + " satış · ciro " + t2(ciroNetli));
  console.log("   ⛔ FARK: " + (marjEslesmis - marjEkran).toFixed(2) + " puan");
  console.log("\n   ⚠ İKİNCİ RAKAM 'DOĞRU MARJ' DEĞİLDİR — yalnız NET'i hesaplanmış");
  console.log("     kümenin kendi marjıdır ve o küme temsili olmayabilir.");
  console.log("     Kanıtladığı tek şey şu: ekrandaki rakam paydasında SAYIP payında");
  console.log("     SAYMADIĞI " + t2(ciroBagliOranYok).trim() + " TL ciro taşıyor,");
  console.log("     yani sistematik olarak DÜŞÜK.");

  // ── Dosyanın kendi komisyon kolonu ─────────────────────────────────────
  console.log("\n\n" + "=".repeat(104));
  console.log("② DOSYANIN KOMİSYON KOLONU — geriye doldurma kaynağı olabilir mi");
  console.log("=".repeat(104));

  const s = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = s.data[5].map((h) => String(h ?? "").trim());
  const J = (ad: string) => {
    const i = bas.indexOf(ad);
    if (i < 0) throw new Error("KOLON YOK: " + ad + " — ölçüm KOŞMAZ.");
    return i;
  };
  const jSip = J("Sipariş Numarası");
  const jUrun = J("Ürün");
  const jPy = J("PAZAR YERI");
  const jKomO = J("KOMİSYON ORANI");
  const jKomT = J("KOMİSYON TUTARI");
  const jListe = J("ÜRÜN LİSTE FİYATI");
  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");

  console.log("\n   dosyada `KOMİSYON ORANI` ve `KOMİSYON TUTARI` kolonları VAR.");

  const oranDolu = veri.filter((r) => sayi(r[jKomO]) > 0);
  const tutarDolu = veri.filter((r) => sayi(r[jKomT]) > 0);
  console.log("   KOMİSYON ORANI > 0 : " + oranDolu.length + " / " + veri.length);
  console.log("   KOMİSYON TUTARI > 0: " + tutarDolu.length + " / " + veri.length);

  /**
   * ⛔ KOLON BAŞLIĞI BİR İDDİADIR. "KOMİSYON ORANI" adını taşıyan kolonun
   * gerçekten oran taşıdığı SINANMALI: tutar/fiyat bölümüyle tutuyor mu?
   */
  /**
   * ⛔ İLK SINIFLANDIRMAM YANLIŞTI VE SİLİNMİYOR: "tutar/fiyat ≠ oran" olan
   * 3824 satırı **TUTMAYAN** diye saymıştım. Örneklere bakınca desen çıktı —
   * hepsi TAM `×1,2`:
   *
   *     yazan %18,00 → tutar/fiyat %21,60      21,60 / 18,00 = 1,2
   *     yazan %15,00 → tutar/fiyat %18,00      18,00 / 15,00 = 1,2
   *     yazan  %4,00 → tutar/fiyat  %4,80       4,80 /  4,00 = 1,2
   *
   * Bu bir tutarsızlık DEĞİL, **komisyona eklenen %20 KDV.** Anayasada
   * yazılı: "Hepsiburada: komisyona +%20 KDV". Yani `KOMİSYON ORANI` KDV
   * HARİÇ, `KOMİSYON TUTARI` KDV DAHİL.
   *
   * ⚠ Ders: bir kolonun "tutmaması", ölçüt yanlış olduğu için de olabilir.
   * Sapmayı sayıp geçmek yerine DESENİNE bakmak gerekiyordu.
   */
  const kovalar = new Map<string, number>();
  const ornek = new Map<string, string>();
  for (const r of veri) {
    const oran = sayi(r[jKomO]);
    const tutar = sayi(r[jKomT]);
    const fiyat = sayi(r[jListe]);
    if (oran <= 0 || fiyat <= 0) continue;
    const carpan = (tutar / fiyat) * 100 / oran;
    const kova =
      Math.abs(carpan - 1) <= 0.01 ? "×1,00  (KDV'siz — oran = tutar/fiyat)"
      : Math.abs(carpan - 1.2) <= 0.01 ? "×1,20  (komisyona +%20 KDV)"
      : "başka  (çarpan " + carpan.toFixed(3) + ")";
    kovalar.set(kova, (kovalar.get(kova) ?? 0) + 1);
    if (!ornek.has(kova)) {
      ornek.set(kova, String(r[jPy]) + " " + String(r[jSip]) + "  %" + oran.toFixed(2) +
        " → tutar/fiyat %" + ((tutar / fiyat) * 100).toFixed(2));
    }
  }
  console.log("\n   (TUTAR / FİYAT) ÷ ORAN  — kolonun ne anlattığı");
  for (const [k, n] of [...kovalar].sort((a, b) => b[1] - a[1])) {
    console.log("     " + String(n).padStart(6) + "  " + k);
    console.log("             ör: " + ornek.get(k));
  }

  const tutanlar = veri
    .map((r) => sayi(r[jKomO]))
    .filter((o) => o > 0);

  if (tutanlar.length > 0) {
    const srt = [...tutanlar].sort((a, b) => a - b);
    const y = (q: number) => srt[Math.floor(srt.length * q)];
    console.log("\n   TUTAN ORANLARIN DAĞILIMI  n=" + srt.length);
    console.log("     min %" + srt[0].toFixed(2) + " · p25 %" + y(0.25).toFixed(2) +
      " · ortanca %" + y(0.5).toFixed(2) + " · p75 %" + y(0.75).toFixed(2) +
      " · max %" + srt[srt.length - 1].toFixed(2));
  }

  const py = new Map<string, { n: number; dolu: number }>();
  for (const r of veri) {
    const k = String(r[jPy] ?? "—").trim() || "(BOŞ)";
    const v = py.get(k) ?? { n: 0, dolu: 0 };
    v.n++;
    if (sayi(r[jKomO]) > 0) v.dolu++;
    py.set(k, v);
  }
  console.log("\n   PAZARYERİ BAZINDA — oranı dolu satır:");
  for (const [k, v] of [...py].sort((a, b) => b[1].n - a[1].n)) {
    console.log("     " + k.padEnd(8) + String(v.dolu).padStart(6) + " / " + String(v.n).padStart(5) +
      "  (" + ((v.dolu / v.n) * 100).toFixed(1) + "%)");
  }

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
