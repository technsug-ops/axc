import { kaynakOku } from "./kaynak-oku";
import { baglantiHedefi, cihazSec, DIS_BAGLANTI, hedefTemizle, KULLANIM_PAKET_SINIRI, paketiSuz, sayfaKalibi } from "../src/lib/kullanim/olay";

/**
 * ============================================================================
 *  KULLANIM İZİ BEKÇİSİ (kullanıcı kararı 13.10.2026)
 * ----------------------------------------------------------------------------
 *  İz iş verisi TAŞIMAZ ve kimlik tarayıcıdan ALINMAZ. Değer testleri saf
 *  gövdeyi çağırır (`lib/kullanim/olay.ts`); kaynak ölçütleri yorumsuz metinde,
 *  KULLANIMA bağlı (anayasa: desen değil çağrı aranır).
 * ============================================================================
 */

let basarisiz = 0;
let calisan = 0;
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", JSON.stringify(ayrinti));
  }
}
const yorumsuz = (yol: string) =>
  kaynakOku(yol).replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");

console.log("\nKULLANIM İZİ BEKÇİSİ\n");

console.log("1) SAYFA KALIBI — kayıt kimliği ve sorgu dizesi iz'e girmez");
kontrol("satış detayı kalıba iner, sorgu ve # atılır", sayfaKalibi("/satislar/cmsrg9jek000104ladtrhgfd8?q=11600993042#ust") === "/satislar/:id", sayfaKalibi("/satislar/cmsrg9jek000104ladtrhgfd8?q=11600993042#ust"));
kontrol("  ...sipariş no parçası da kimlik sayılır", sayfaKalibi("/okut/11600993042") === "/okut/:id");
kontrol("  ...ortadaki kimlik kalıba iner, sondaki sayfa adı kalır", sayfaKalibi("/alimlar/cmv0vqt0r000006jsaeldp5j0/mal-kabul") === "/alimlar/:id/mal-kabul");
kontrol("  ...rakamsız yol olduğu gibi kalır (küçük harfle)", sayfaKalibi("/Hakedis") === "/hakedis");
kontrol("  ...mutlak adreste yalnız yol", sayfaKalibi("https://bezirga.com/hakedis?sekme=detay") === "/hakedis");
kontrol("  ...kök «/»", sayfaKalibi("/") === "/" && sayfaKalibi("/?pencere=BU_AY") === "/");

console.log("\n2) DÜĞME YAZISI — rakam sızmaz");
kontrol("sipariş no «#» olur", hedefTemizle("İptal et 11600993042") === "İptal et #");
kontrol("  ...tutar da «#»", hedefTemizle("Öde ₺1.234,56") === "Öde ₺#.#,#");
kontrol("  ...boşluk sadeleşir", hedefTemizle("  Satış\n   ekle ") === "Satış ekle");
kontrol("  ...boş yazı → hedef yok", hedefTemizle("   ") === null && hedefTemizle(null) === null);
kontrol("  ...uzun yazı 60'ta kesilir", (hedefTemizle("a".repeat(200)) ?? "").length === 60);

console.log("\n3) BAĞLANTI HEDEFİ");
kontrol("site içi bağlantı → kalıp", baglantiHedefi("/satislar/abc123?x=1", "https://bezirga.com") === "→ /satislar/:id");
kontrol("  ...site dışı → kod (metin değil)", baglantiHedefi("https://www.trendyol.com/x/123", "https://bezirga.com") === DIS_BAGLANTI);

console.log("\n4) CİHAZ — arayüzün kırılımlarıyla aynı (md 768 · lg 1024)");
kontrol("767 telefon · 768 tablet · 1023 tablet · 1024 masaüstü",
  cihazSec(767) === "TELEFON" && cihazSec(768) === "TABLET" && cihazSec(1023) === "TABLET" && cihazSec(1024) === "MASAUSTU");

console.log("\n5) SUNUCU PAKETİ YENİDEN SÜZER — tarayıcının söylediği olduğu gibi yazılmaz");
const s = paketiSuz([
  { tur: "SAYFA", sayfa: "/satislar/999888?q=gizli", oncekiSayfa: "/kart/cm123abc", cihaz: "TELEFON" },
  { tur: "TIKLAMA", sayfa: "/hakedis", hedef: "→ /satislar/11600993042", cihaz: "MASAUSTU" },
  { tur: "TIKLAMA", sayfa: "/hakedis", hedef: "Sipariş 4168771298 iptal", cihaz: "MASAUSTU" },
  { tur: "TIKLAMA", sayfa: "/hakedis", hedef: "   ", cihaz: "MASAUSTU" },
  { tur: "HACK", sayfa: "/", cihaz: "MASAUSTU" },
  { tur: "SAYFA", sayfa: "/", cihaz: "UZAY" },
  { tur: "TIKLAMA", sayfa: "/x", hedef: "Kaydet", oncekiSayfa: "/y", cihaz: "TABLET" },
]);
kontrol("sayfa ve önceki sayfa sunucuda kalıba iner", s[0]?.sayfa === "/satislar/:id" && s[0]?.oncekiSayfa === "/kart/:id", s[0]);
kontrol("  ...tarayıcıdan gelen bağlantı hedefi YENİDEN kalıba iner", s[1]?.hedef === "→ /satislar/:id", s[1]);
kontrol("  ...düğme yazısındaki rakam sunucuda da gizlenir", s[2]?.hedef === "Sipariş # iptal", s[2]);
kontrol("  ...hedefsiz tıklama · bilinmeyen tür · bilinmeyen cihaz ATILIR (4 olay kalır)", s.length === 4, s.length);
kontrol("  ...tıklamada önceki sayfa yazılmaz", s[3]?.oncekiSayfa === null && s[3]?.hedef === "Kaydet", s[3]);
kontrol("  ...dizi değilse boş", paketiSuz({ olaylar: [] }).length === 0 && paketiSuz(null).length === 0);
const cok = Array.from({ length: KULLANIM_PAKET_SINIRI + 20 }, () => ({ tur: "SAYFA", sayfa: "/", cihaz: "MASAUSTU" }));
kontrol(`  ...paket sınırı (${KULLANIM_PAKET_SINIRI}) aşılmaz`, paketiSuz(cok).length === KULLANIM_PAKET_SINIRI);

console.log("\n6) UÇ — kimlik OTURUMDAN, paket süzülür");
const uc = yorumsuz("src/app/api/kullanim/route.ts");
kontrol("oturum yoksa hiçbir şey yazılmaz", /const baglam = await yetkiBaglami\(\);\s*if \(!baglam\) return new Response\(null, \{ status: 204 \}\);/.test(uc));
kontrol("  ...firma ve kullanıcı oturumdan (tarayıcıdan değil)", /companyId: baglam\.companyId,\s*userId: baglam\.kullaniciId,/.test(uc) && !/companyId: o\./.test(uc) && !/userId: o\./.test(uc));
kontrol("  ...yazılan küme süzülmüş paket", /const olaylar = paketiSuz\(/.test(uc) && /data: olaylar\.map\(/.test(uc));
kontrol("  ...hata YUTULMAZ, sunucu kaydına tam yazılır", /catch \(hata\) \{\s*console\.error\("\[kullanim\] iz yazılamadı:", hata\);/.test(uc));

console.log("\n7) TARAYICI — yalnız tıklama, yazma alanı dinlenmez");
const bilesen = yorumsuz("src/components/kullanim-izi.tsx");
kontrol("tıklama dinleniyor", /document\.addEventListener\("click", tikla/.test(bilesen));
kontrol("  ...tuş/yazma olayı DİNLENMİYOR", !/addEventListener\("(input|keydown|keyup|keypress|change|paste)"/.test(bilesen));
kontrol("  ...input/textarea değeri OKUNMUYOR", !/\.value\b/.test(bilesen));
const yerlesim = yorumsuz("src/app/layout.tsx");
kontrol("yerleşimde bir kez bağlı", (yerlesim.match(/<KullanimIzi \/>/g) ?? []).length === 1);

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} içinde)`);
  process.exitCode = 1;
}
