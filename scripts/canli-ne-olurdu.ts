/**
 * ============================================================================
 *  "BAŞKA PARTİ DÜŞSEYDİ NE OLURDU" — salt okuma, HİÇBİR ŞEY YAZMAZ
 * ----------------------------------------------------------------------------
 *  ⚠ ÖNCE GİRDİ DOĞRULANIR. Motoru elle kurulmuş bir girdiyle koşup çıkan
 *  rakamı "gerçek" diye sunmak, uydurma bir üçüncü gerçek üretmektir. Bu
 *  yüzden betik ÖNCE mevcut maliyetle koşar ve sonucu DEFTERDEKİ damgayla
 *  karşılaştırır. Tutmuyorsa DURUR — alternatif rakamı basmaz.
 *  (Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir".)
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KOD = process.argv[2] ?? "11491734874";
const YENI_BIRIM = Number(process.argv[3] ?? "873.99");

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { karOnizle } = await import("../src/lib/kar-yeniden");

  const satis = await prisma.sale.findFirst({
    where: { code: KOD },
    select: {
      id: true, code: true, net1Amount: true, net2Amount: true,
      cargoCarrierId: true, cargoDesi: true,
      items: { select: { id: true, commissionRate: true } },
    },
  });
  if (!satis) { console.log("satış yok"); process.exitCode = 1; return; }

  /** ⚠ GİRDİ SATIŞIN KENDİ DEĞERLERİNDEN — hiçbir şey uydurulmuyor. */
  const girdi = {
    saleId: satis.id,
    kalemler: satis.items.map((k) => ({
      saleItemId: k.id,
      commissionRate: k.commissionRate === null ? null : Number(k.commissionRate.toString()),
      /** Tutar snapshot'ı SaleItem'da yok; oran kullanılıyor (motorun kendi yolu). */
      commissionAmount: null,
    })),
    cargoCarrierId: satis.cargoCarrierId,
    cargoDesi: satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
    cargoAmountManual: null,
  };

  // ── ① GİRDİ DOĞRULAMASI: motor, defterdeki damgayı üretiyor mu? ────────
  const mevcut = await karOnizle(girdi);
  if (!mevcut) { console.log("önizleme kurulamadı — betik durdu."); process.exitCode = 1; return; }

  const damgaNet2 = Number(satis.net2Amount?.toString() ?? "NaN");
  const onizlemeNet2 = mevcut.yeni.net2;
  const fark = Math.abs(damgaNet2 - onizlemeNet2);

  console.log(`\n${KOD}`);
  console.log(`  defterdeki damga NET-2 : ${damgaNet2.toFixed(4)}`);
  console.log(`  motorun ürettiği NET-2 : ${onizlemeNet2.toFixed(4)}`);
  console.log(`  fark                   : ${fark.toFixed(4)}`);
  if (fark > 0.01) {
    console.log(`\n  ⛔ GİRDİ DOĞRULANMADI — motor damgayı üretmiyor.`);
    console.log(`  Alternatif rakam BASILMADI: doğrulanmamış bir girdiden`);
    console.log(`  çıkan sayı ölçüm değil, tahmindir.`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ✓ girdi doğrulandı — alternatif hesaplanabilir.`);

  const kar = mevcut.yeni;
  console.log(`\n  MEVCUT (defter · FIFO en eski parti)`);
  console.log(`    NET-1 ${kar.net1.toFixed(2)} · NET-2 ${kar.net2.toFixed(2)}`);
  for (const kalem of kar.kalemler) {
    for (const k of kalem.kesintiler) {
      console.log(`      ${k.code.padEnd(22)} ${k.tutar.toFixed(2).padStart(12)}`);
    }
  }
  for (const k of kar.siparisKesintileri) {
    console.log(`      ${k.code.padEnd(22)} ${k.tutar.toFixed(2).padStart(12)}`);
  }

  /**
   * ── ② ALTERNATİF ────────────────────────────────────────────────────
   *
   * ⚠ YALNIZ NET-1 KESİN OLARAK VERİLİR. Kesintiler (komisyon, stopaj,
   * sabit gider, kargo) maliyete BAĞLI DEĞİL — o yüzden maliyet farkı
   * NET-1'e birebir yansır ve bu aritmetik, tahmin değil.
   *
   * ⚠ NET-2 BURADA HESAPLANMAZ. Ödenecek KDV, alış KDV indirimi üzerinden
   * maliyete BAĞLI; doğrusu motoru o maliyetle koşmaktır. Elle çarpıp
   * "yaklaşık şu" demek, defterle tutmayan ÜÇÜNCÜ bir rakam üretirdi.
   * Bunun yerine SINIR çiziliyor: fark en fazla maliyet farkının KDV'si.
   */
  const maliyetSatiri = kar.kalemler
    .flatMap((kl) => kl.kesintiler)
    .find((k) => k.code === "MALIYET");
  if (!maliyetSatiri) { console.log("\n  MALIYET satiri yok — durdu."); return; }
  const mevcutMaliyet = maliyetSatiri.tutar;
  const yeniMaliyet = YENI_BIRIM;
  const fark2 = mevcutMaliyet - yeniMaliyet;

  console.log(`\n  ALTERNATIF (fiziken gonderilen parti · birim ${YENI_BIRIM})`);
  console.log(`    maliyet  ${mevcutMaliyet.toFixed(2)} -> ${yeniMaliyet.toFixed(2)}   (fark ${fark2.toFixed(2)})`);
  console.log(`    NET-1    ${kar.net1.toFixed(2)} -> ${(kar.net1 + fark2).toFixed(2)}   [KESIN]`);
  console.log(`    NET-2    ${kar.net2.toFixed(2)} -> ${(kar.net2 + fark2 - fark2 * 0.2).toFixed(2)} … ${(kar.net2 + fark2).toFixed(2)}   [ARALIK]`);
  console.log(`             ⚠ NET-2 tek sayi olarak verilmiyor: odenecek KDV`);
  console.log(`               alis KDV indirimi uzerinden maliyete bagli.`);
  console.log(`               Kesin rakam motorun o maliyetle kosulmasini ister.`);
}
main();
