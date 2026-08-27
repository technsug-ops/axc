import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  AMAZON SATIŞ DOSYASI — KURU ÖLÇÜM (SALT OKUMA, HİÇBİR ŞEY YAZILMAZ)
 * ----------------------------------------------------------------------------
 *      npm run canli:amazon-olcum
 *
 *  ⛔ BU DOSYA AMAZON'UN KENDİ BELGESİ DEĞİL — kullanıcının kendi hesap
 *  tablosu. Kaynak önceliğinde 2. basamak (kendi defterimiz), 1. basamak
 *  değil: komisyon ve kargo rakamları kanalın faturasıyla DOĞRULANMAMIŞTIR.
 *
 *  ⛔ HÜKÜM YOK — burada yalnız "girilirse ne olur" ölçülüyor.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/amazon satışlar.xlsx";
const SAYIM = "sayim-20260827-2";

const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (n: number) => n.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt))[0];
  const bas = s.data[0].map((h) => String(h ?? "").trim());
  /**
   * ⛔ KOLON BULUNAMAZSA ÖLÇÜM KOŞMAZ — "0 buldum" ile "okuyamadım" ayrı
   * şeylerdir ve ayırt edilemeyen bir denetim, denetim değildir.
   */
  const J = (ad: string) => {
    const i = bas.indexOf(ad);
    if (i < 0) throw new Error("KOLON YOK: " + ad + " — dosya biçimi değişmiş, ölçüm KOŞMAZ.");
    return i;
  };
  const jSip = J("Sipariş Numarası");
  const jSku = J("SKU");
  const jPy = J("PAZAR YERI");
  const jUrun = J("Ürün");
  const jTur = J("TÜR");
  const jAdet = J("Satış Miktarı");
  const jTar = J("Tarih");
  const jAlis = J("ÜRÜN ALIŞ FİYATI");
  const jListe = J("ÜRÜN LİSTE FİYATI");
  const jKomT = J("KOMİSYON TUTARI");
  const jDiger = J("DİĞER GİDERLER");
  const jKargo = J("KARGO");
  const jKar = J("KAR");

  const satir = s.data.slice(1).filter((r) => String(r[jSip] ?? "").trim() !== "");

  console.log("\n" + "=".repeat(100));
  console.log("AMAZON SATIŞ DOSYASI — KURU ÖLÇÜM (salt okuma)");
  console.log("=".repeat(100));

  console.log("\n① KAPSAM");
  console.log("   satır: " + satir.length + "   ·   dosyadaki kolon: " + bas.filter((b) => b !== "").length);
  const tur = new Map<string, number>();
  const py = new Map<string, number>();
  for (const r of satir) {
    const tt = String(r[jTur] ?? "—");
    const pp = String(r[jPy] ?? "—");
    tur.set(tt, (tur.get(tt) ?? 0) + 1);
    py.set(pp, (py.get(pp) ?? 0) + 1);
  }
  console.log("   TÜR       : " + [...tur].map(([k, n]) => k + "=" + n).join(" · "));
  console.log("   PAZAR YERI: " + [...py].map(([k, n]) => k + "=" + n).join(" · "));

  const tarihler = satir
    .map((r) => (r[jTar] instanceof Date ? (r[jTar] as Date) : new Date(String(r[jTar]))))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  console.log("   tarih aralığı: " + tarihler[0].toISOString().slice(0, 10) +
    " → " + tarihler[tarihler.length - 1].toISOString().slice(0, 10) +
    "   (okunamayan " + (satir.length - tarihler.length) + ")");
  const ay = new Map<string, number>();
  for (const d of tarihler) {
    const k = d.toISOString().slice(0, 7);
    ay.set(k, (ay.get(k) ?? 0) + 1);
  }
  console.log("   ay: " + [...ay].sort().map(([k, n]) => k + "=" + n).join(" · "));

  console.log("\n② ARİTMETİK — dosya kendi içinde tutuyor mu");
  let tutan = 0;
  const sapan: string[] = [];
  for (const r of satir) {
    const beklenen = sayi(r[jListe]) - sayi(r[jAlis]) - sayi(r[jKomT]) - sayi(r[jDiger]) - sayi(r[jKargo]);
    if (Math.abs(beklenen - sayi(r[jKar])) <= 1) tutan++;
    else sapan.push(String(r[jSip]) + "  beklenen=" + beklenen.toFixed(2) + "  yazan=" + sayi(r[jKar]).toFixed(2));
  }
  console.log("   liste − alış − komisyon − diğer − kargo = KAR   →  tutan " + tutan + "/" + satir.length);
  for (const x of sapan.slice(0, 6)) console.log("     ⚠ " + x);

  console.log("\n③ KOMİSYON ORANI — dosyanın ima ettiği");
  const oranlar = satir
    .map((r) => (sayi(r[jListe]) > 0 ? (sayi(r[jKomT]) / sayi(r[jListe])) * 100 : NaN))
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => a - b);
  const y = (q: number) => oranlar[Math.floor(oranlar.length * q)];
  console.log("   n=" + oranlar.length + "   min %" + oranlar[0].toFixed(2) +
    " · p25 %" + y(0.25).toFixed(2) + " · ortanca %" + y(0.5).toFixed(2) +
    " · p75 %" + y(0.75).toFixed(2) + " · max %" + oranlar[oranlar.length - 1].toFixed(2));
  console.log("   ⚠ Bu oran DOSYANIN kendi kolonundan türetildi, Amazon'un faturasından DEĞİL.");

  console.log("\n④ KİMLİK — SKU'lar sistemde çözülüyor mu");
  const varyantlar = await p.productVariant.findMany({
    select: {
      id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } },
      product: { select: { name: true } },
    },
  });
  const indeks = new Map<string, (typeof varyantlar)[number]>();
  for (const v of varyantlar) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") indeks.set(k.trim(), v);
    }
  }
  const cozulen = new Map<string, number>();
  const cozulmeyen = new Map<string, { n: number; ad: string }>();
  for (const r of satir) {
    const kod = String(r[jSku] ?? "").trim();
    const v = indeks.get(kod);
    if (v) cozulen.set(v.id, (cozulen.get(v.id) ?? 0) + sayi(r[jAdet]));
    else {
      const mv = cozulmeyen.get(kod) ?? { n: 0, ad: String(r[jUrun]).slice(0, 44) };
      mv.n += sayi(r[jAdet]);
      cozulmeyen.set(kod, mv);
    }
  }
  console.log("   çözülen varyant : " + cozulen.size + "   ·   çözülmeyen kod: " + cozulmeyen.size);
  for (const [k, mv] of [...cozulmeyen].sort((a, b) => b[1].n - a[1].n).slice(0, 12)) {
    console.log("     ⛔ " + (k || "(BOŞ)").padEnd(20) + String(mv.n).padStart(3) + " ad   " + mv.ad);
  }

  console.log("\n⑤ ÇAKIŞMA — bu sipariş no'lar sistemde zaten var mı");
  const nolar = [...new Set(satir.map((r) => String(r[jSip]).trim()))];
  const mevcut = await p.sale.findMany({ where: { code: { in: nolar } }, select: { code: true } });
  console.log("   farklı sipariş no: " + nolar.length + "   ·   sistemde ZATEN olan: " + mevcut.length);
  for (const m of mevcut.slice(0, 10)) console.log("     · " + m.code);

  console.log("\n⑥ SAYIMLA KESİŞİM");
  const sayim = await p.stokSayimi.findFirst({ where: { kod: SAYIM }, select: { id: true } });
  const acik = await p.stokSayimSatiri.findMany({
    where: { sayimId: sayim!.id, kapsamdaydi: true, duzeltmeYazildiAt: null },
    select: {
      sayilanAdet: true, variantId: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });
  let kesisenOkutulmayan = 0;
  let kesisenEksik = 0;
  for (const o of acik) {
    const ad = cozulen.get(o.variantId);
    if (!ad) continue;
    const nerede = o.sayilanAdet === null ? "OKUTULMADI" : "sayıldı " + o.sayilanAdet;
    if (o.sayilanAdet === null) kesisenOkutulmayan++;
    else kesisenEksik++;
    console.log("     ✓ " + o.variant.sku.padEnd(19) + String(ad).padStart(3) + " ad amazon   " +
      nerede.padEnd(12) + o.variant.product.name.slice(0, 40));
  }
  console.log("   → okutulmayanlardan " + kesisenOkutulmayan + " · sayılmışlardan " + kesisenEksik + " varyant bu dosyada geçiyor");

  console.log("\n⑦ GİRİLİRSE NE DEĞİŞİR");
  const toplamAdet = satir.reduce((t, r) => t + sayi(r[jAdet]), 0);
  const toplamCiro = satir.reduce((t, r) => t + sayi(r[jListe]) * sayi(r[jAdet]), 0);
  console.log("   ciroya eklenir : " + t2(toplamCiro) + " TL   (" + toplamAdet + " adet)");
  console.log("   ⚠ Taban: KDV DAHİL liste fiyatı toplamı — başka bir taban değil.");
  console.log("   ⚠ Amazon'un ChannelFee kuralı YOK: girilen her satış 'kural eksik' rozetiyle");
  console.log("     durur. CİRO ve STOK doğru olur, NET-1/NET-2 hesaplanmaz.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
