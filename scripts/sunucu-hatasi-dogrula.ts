/**
 * ============================================================================
 *  SUNUCU HATASI İZİ BEKÇİSİ (K353, 22.10.2026)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run sunucu-hatasi:dogrula
 *
 *  NEDEN VAR: kullanıcı «Bu ekran çizilemedi» gördü, ekran bir hata kodu verdi
 *  ve sebep HİÇ öğrenilemedi (Vercel günlüğüne erişim yok). Artık her sunucu
 *  hatası kendi iz tablomuza yazılıyor. Bu bekçi üç şeyi sınar:
 *   ① saf iz gövdesi DEĞERLE (akış sinyali yazılmaz · parola silinir · sorgu
 *     yazılmaz · uzun mesaj kesilir ama JSON BOZULMAZ ve kesildiği yazar);
 *   ② kanca (`instrumentation.ts`) gerçekten yazıcıyı çağırıyor ve yazıcı
 *     düşünce SESSİZ geçmiyor;
 *   ③ ekran izleri gösteriyor ve sıfırken de duruyor (izin doğum tarihiyle).
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import {
  MESAJ_TAVANI,
  parolayiSil,
  SUNUCU_HATASI_EYLEMI,
  sunucuHatasiCoz,
  sunucuHatasiIzi,
} from "../src/lib/hata/sunucu-hatasi";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}
const yorumsuz = (k: string) => k.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("\n1) İZ GÖVDESİ — değerle");
{
  const hata = Object.assign(new Error("Can't reach database server at `db:3306`"), { digest: "2868110011" });
  const iz = sunucuHatasiIzi(hata, { path: "/satislar?q=ahmet+yilmaz", method: "GET" }, { routePath: "/satislar", routeType: "render", renderSource: "server-rendering" });
  const d = iz ? (JSON.parse(iz.detail) as Record<string, unknown>) : {};
  kontrol("gerçek hata iz üretir", iz !== null && iz.action === SUNUCU_HATASI_EYLEMI);
  kontrol("  ...ekrandaki hata kodu (digest) izde", d.digest === "2868110011");
  kontrol("  ...mesaj TAM", d.mesaj === "Can't reach database server at `db:3306`");
  kontrol("  ...tür ve rota", iz?.targetType === "render" && iz.targetId === "/satislar" && d.tur === "render");
  kontrol("  ...adresin SORGU kısmı yazılmaz (arama metni)", d.yol === "/satislar" && !iz?.detail.includes("ahmet"));

  for (const sinyal of ["NEXT_REDIRECT;replace;/giris;307;", "NEXT_NOT_FOUND", "NEXT_HTTP_ERROR_FALLBACK;404"]) {
    const s = Object.assign(new Error(sinyal), { digest: sinyal });
    kontrol(`akış sinyali iz DEĞİL: ${sinyal.split(";")[0]}`, sunucuHatasiIzi(s, { path: "/", method: "GET" }, {}) === null);
  }
  kontrol("akış sinyaliyle BAŞLAMAYAN mesaj yine iz üretir", sunucuHatasiIzi(new Error("x NEXT_REDIRECT"), { path: "/", method: "GET" }, {}) !== null);

  const parolali = new Error("bağlanılamadı mysql://kul:Gizli%40Parola1@sunucu:3306/db");
  const pz = sunucuHatasiIzi(parolali, { path: "/", method: "GET" }, {});
  kontrol("bağlantı adresindeki PAROLA silinir", pz !== null && !pz.detail.includes("Gizli") && pz.detail.includes("mysql://kul:***@sunucu"));
  kontrol("  ...yığında da silinir", pz !== null && !String((JSON.parse(pz.detail) as Record<string, unknown>).yigin).includes("Gizli"));
  kontrol("parolasız metin değişmez", parolayiSil("düz metin mysql://sunucu/db") === "düz metin mysql://sunucu/db");

  const uzun = new Error("ğ".repeat(MESAJ_TAVANI + 500));
  const uz = sunucuHatasiIzi(uzun, { path: "/", method: "GET" }, {});
  const uzd = uz ? (JSON.parse(uz.detail) as Record<string, unknown>) : {};
  kontrol("uzun mesaj kesilir ve KESİLDİĞİ yazar", uzd.mesajKirpildi === true && String(uzd.mesaj).length === MESAJ_TAVANI);
  kontrol("  ...iz TEXT sütununa sığar (64 KB, bayt olarak)", uz !== null && Buffer.byteLength(uz.detail, "utf8") < 65_535, uz ? Buffer.byteLength(uz.detail, "utf8") : null);
  kontrol("kısa mesaj kesilmiş SAYILMAZ", d.mesajKirpildi === false);
  const uzunRota = sunucuHatasiIzi(new Error("x"), { path: "/" + "a".repeat(400), method: "GET" }, {});
  kontrol("rota alanı varchar(191) sınırında", uzunRota !== null && uzunRota.targetId.length <= 191);
  kontrol("Error olmayan değer de iz üretir", sunucuHatasiIzi("düz metin", { path: "/", method: "POST" }, {}) !== null);

  const geri = iz ? sunucuHatasiCoz(new Date(0), iz.targetId, iz.detail) : null;
  kontrol("ekran çözümü: kod · yol · tür · mesaj", geri?.digest === "2868110011" && geri.yol === "/satislar" && geri.tur === "render" && geri.mesaj.startsWith("Can't reach"));
  const bozuk = sunucuHatasiCoz(new Date(0), "/x", "{bozuk");
  kontrol("bozuk iz de GÖRÜNÜR (ham metin)", bozuk.mesaj === "{bozuk" && bozuk.yol === "/x");
  kosanBolumler.push("govde");
}

console.log("\n2) KANCA ve YAZICI — kaynak");
{
  const kanca = yorumsuz(kaynakOku("src/instrumentation.ts"));
  kontrol("kanca `onRequestError` dışa aktarılıyor", /export const onRequestError: Instrumentation\.onRequestError = async \(/.test(kanca));
  kontrol("  ...yazıcıyı BEKLEYEREK çağırıyor (Next: await edilmeyen iş düşer)", /await sunucuHatasiniKaydet\(hata, \{ path: istek\.path, method: istek\.method \}, baglam\);/.test(kanca));
  kontrol("  ...başlık/çerez geçirmiyor", !/istek\.headers/.test(kanca));
  const yazici = yorumsuz(kaynakOku("src/lib/hata/sunucu-hatasi-kaydi.ts"));
  const govdeBas = yazici.indexOf("export async function sunucuHatasiniKaydet(");
  const govde = govdeBas >= 0 ? yazici.slice(govdeBas, yazici.indexOf("\n}", govdeBas)) : "";
  kontrol("yazıcı izi saf gövdeden kurup yazıyor", /const iz = sunucuHatasiIzi\(hata, istek, baglam\);\s*if \(iz === null\) return;\s*try \{\s*await prisma\.auditLog\.create\(\{ data: iz \}\);/.test(govde));
  kontrol("  ...yazım düşerse SESSİZ değil (sunucu günlüğüne tam)", /\} catch \(yazimHatasi\) \{\s*console\.error\([^)]*yazimHatasi[^)]*iz\.detail\);\s*\}/.test(govde));
  kosanBolumler.push("kanca");
}

console.log("\n3) EKRAN — Gece bekçi turu sayfası");
{
  const sayfa = yorumsuz(kaynakOku("src/app/ayarlar/gece-turu/page.tsx"));
  kontrol("izler okunuyor", /const hatalar = await sonSunucuHatalari\(7, HATA_GOSTERILEN\);/.test(sayfa));
  const mapBas = sayfa.indexOf("hatalar.satirlar.map((h, i) => (");
  const satirBlok = mapBas >= 0 ? sayfa.slice(mapBas, sayfa.indexOf("))}", mapBas)) : "";
  kontrol("  ...her satırda zaman · kod · yol · mesaj çiziliyor",
    satirBlok.includes("bicim.tarihSaat(h.zaman)") && satirBlok.includes("<KopyalanabilirKod deger={h.digest}") &&
      satirBlok.includes("{h.yol}") && satirBlok.includes("{h.mesaj}"),
    { blokUzunlugu: satirBlok.length });
  kontrol("  ...sıfırken «hata yok» YAZIYOR (kutu kaybolmuyor)", /hatalar\.toplam > 0 \? t\("hataSayisi", \{ sayi: hatalar\.toplam \}\) : t\("hataYok"\)/.test(sayfa));
  kontrol("  ...izin doğum tarihi yazıyor", /t\("hataDogum", \{ tarih: SUNUCU_HATASI_IZI_BASLANGICI \}\)/.test(sayfa));
  kontrol("  ...gösterilenden fazlası varsa SÖYLÜYOR", /hatalar\.toplam > hatalar\.satirlar\.length \? \(/.test(sayfa));
  kosanBolumler.push("ekran");
}

console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
