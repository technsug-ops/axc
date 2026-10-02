import { kaynakOku } from "./kaynak-oku";
import { aktifEtmeEksikleri, urunAktifMi } from "../src/lib/urun-aktiflik";

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

/**
 * ═══ K315 — PASİFTEN AKTİFE GEÇİŞ: EAN + KATEGORİ + MARKA ══════════════════
 * Saf kural DEĞERLE (desen taranmaz); ayrımın iki yakası: geçiş olan/olmayan.
 * Geçerli EAN örneği: 4006381333931 (kontrol hanesi tutar) · bozuk: …932.
 */
{
  const tam = { oncedenAktif: false as boolean | null, simdiAktif: true, barkod: "4006381333931", kategoriVar: true, markaTablodaMi: true };
  const es = (a: string[], b: string[]) => a.join(",") === b.join(",");
  kontrol("K315 hepsi tamam → geçiş serbest", es(aktifEtmeEksikleri(tam), []));
  kontrol("K315 barkod yok → EAN eksik", es(aktifEtmeEksikleri({ ...tam, barkod: "" }), ["EAN"]));
  kontrol("K315 kontrol hanesi tutmuyor → EAN eksik", es(aktifEtmeEksikleri({ ...tam, barkod: "4006381333932" }), ["EAN"]));
  kontrol("K315 EAN olmayan kod (HBCV…) → EAN eksik", es(aktifEtmeEksikleri({ ...tam, barkod: "HBCV00006G7MR1" }), ["EAN"]));
  kontrol("K315 boşluklu geçerli EAN kabul", es(aktifEtmeEksikleri({ ...tam, barkod: " 4006381333931 " }), []));
  kontrol("K315 kategori yok → KATEGORI eksik", es(aktifEtmeEksikleri({ ...tam, kategoriVar: false }), ["KATEGORI"]));
  kontrol("K315 marka tabloda değil → MARKA eksik", es(aktifEtmeEksikleri({ ...tam, markaTablodaMi: false }), ["MARKA"]));
  kontrol("K315 üçü de eksik → üçü sırayla", es(aktifEtmeEksikleri({ ...tam, barkod: null, kategoriVar: false, markaTablodaMi: false }), ["EAN", "KATEGORI", "MARKA"]));
  /** KAPSAM: zaten aktif kaydın düzenlenmesi kilitlenmez; yeni varyant ve pasif bırakılan kayıt kapsam dışı. */
  const eksikHepsi = { ...tam, barkod: null, kategoriVar: false, markaTablodaMi: false };
  kontrol("K315 zaten AKTİF kayıt eksikle de düzenlenir", es(aktifEtmeEksikleri({ ...eksikHepsi, oncedenAktif: true }), []));
  kontrol("K315 YENİ varyant kapsam dışı", es(aktifEtmeEksikleri({ ...eksikHepsi, oncedenAktif: null }), []));
  kontrol("K315 pasif kalan kayıt eksikle de kaydedilir", es(aktifEtmeEksikleri({ ...eksikHepsi, simdiAktif: false }), []));

  /** BAĞ — kullanım bloğuna daraltılmış (yorumsuz kod). */
  const basla = a.indexOf("const aktifEtmeHatalari: string[] = [];");
  const blokK = basla >= 0 ? a.slice(basla, basla + 1200) : "";
  kontrol("K315 güncelleme kuralı çağırıyor", blokK.includes("aktifEtmeEksikleri({"));
  kontrol("K315 eski hâl kayıttan okunuyor (isActive)", /select:\s*\{\s*id:\s*true,\s*isActive:\s*true\s*\}/.test(a));
  kontrol("K315 eski hâl kurala veriliyor", blokK.includes("oncedenAktif: v.id ? (oncekiAktiflik.get(v.id) ?? null) : null,"));
  kontrol("K315 marka TABLO bağından ölçülüyor", blokK.includes("markaTablodaMi: markaBagi !== null,"));
  kontrol("K315 kategori formdan ölçülüyor", blokK.includes("kategoriVar: Boolean(veri.kategoriId),"));
  kontrol("K315 eksikte YAZMADAN dönüyor", blokK.includes("if (aktifEtmeHatalari.length) return { hatalar: aktifEtmeHatalari };"));
  /** SIRA — kontrol yazımdan ÖNCE; ikisi de var olmalı (indexOf −1 tuzağı). */
  const iKontrol = a.indexOf("if (aktifEtmeHatalari.length) return");
  const iYazim = a.indexOf("await tx.product.update({");
  kontrol("K315 kontrol satırı var", iKontrol >= 0);
  kontrol("K315 yazım satırı var", iYazim >= 0);
  kontrol("K315 kontrol yazımdan ÖNCE", iKontrol >= 0 && iYazim >= 0 && iKontrol < iYazim);

  /** FORM İPUCU — koşul SONUCUYLA birlikte (koşul öldürülürse desen kalmasın). */
  const f = yorumsuz(kaynakOku("src/app/urunler/urun-formu.tsx"));
  kontrol(
    "K315 formda şart yalnız KAYITTA PASİF varyanta çiziliyor",
    /** ⚠ `{` ÇAPASI ŞART: `{false && varyant.id && …` bozması deseni İÇİNDE
     *  taşıyordu ve ilk sürüm yeşil kaldı (mutasyonla yakalandı). */
    /\{varyant\.id && kayittaPasif\.has\(varyant\.id\) \? \(\s*<p className="text-sm">\{t\("aktifEtmeSarti"\)\}<\/p>/.test(f),
  );
  kontrol(
    "K315 kayıtta pasif kümesi BAŞLANGIÇTAN (kayıttaki hâl) kuruluyor",
    f.includes(".filter((v) => v.id && !v.aktif)"),
  );
}

console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
