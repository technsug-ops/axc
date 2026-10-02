import { kaynakOku } from "./kaynak-oku";
import { urunAktifMi } from "../src/lib/urun-aktiflik";

/**
 * ============================================================================
 *  ÜRÜN AKTİFLİĞİ BEKÇİSİ (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run urun-aktiflik:dogrula
 *
 *  `Product.isActive`in arayüzde yazıcısı yoktu: varyant aktif edilince ürün
 *  listede «pasif» kalıyordu (vaka HBCV00006G7MR1). Kural: ürün, en az bir
 *  varyantı aktifse aktiftir — oluşturmada ve güncellemede.
 * ============================================================================
 */

console.log("\nÜRÜN AKTİFLİĞİ BEKÇİSİ\n");
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean) {
  if (kosul) { gecen++; console.log("  OK  " + ad); } else { hata++; console.log("  X   " + ad); }
}
function yorumsuz(m: string) {
  return m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

kontrol("bir varyant aktif → ürün AKTİF", urunAktifMi([{ aktif: false }, { aktif: true }]) === true);
kontrol("hepsi pasif → ürün PASİF", urunAktifMi([{ aktif: false }, { aktif: false }]) === false);
kontrol("tek aktif varyant → AKTİF", urunAktifMi([{ aktif: true }]) === true);
kontrol("boş liste → PASİF (aktif varyant yok)", urunAktifMi([]) === false);

const a = yorumsuz(kaynakOku("src/app/urunler/actions.ts"));
const olustur = a.slice(a.indexOf("const urun = await prisma.product.create({"), a.indexOf("const urun = await prisma.product.create({") + 400);
const guncelle = a.slice(a.indexOf("await tx.product.update({"), a.indexOf("await tx.product.update({") + 400);
kontrol("oluşturma ürün aktifliğini varyantlardan yazıyor", olustur.includes("isActive: urunAktifMi(veri.varyantlar),"));
kontrol("güncelleme ürün aktifliğini varyantlardan yazıyor", guncelle.includes("isActive: urunAktifMi(veri.varyantlar),"));

console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
