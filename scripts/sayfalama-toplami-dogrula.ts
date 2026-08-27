import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  SAYFALAMA ↔ TOPLAM BEKÇİSİ (27.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run sayfalama-toplami:dogrula
 *
 *  ⛔ KORUNAN ŞEY: **sayfalanmış bir listede toplam, SAYFANIN değil SÜZGECİN
 *  TAMAMININ toplamıdır** (İlke #15).
 *
 *  ⚠ NİYE BEKÇİ GEREKTİ: `/satislar` ve `/alimlar` bugün sayfalandı. Toplamlar
 *  o güne kadar ÇEKİLEN DİZİDEN hesaplanıyordu — ekranın bütün defteri
 *  çekmesinin asıl sebebi buydu (5778 satır · 10,1 MB · 1600 ms). Toplamlar
 *  veritabanına taşındı. Ama biri yarın `satislar.reduce(...)` yazarsa:
 *
 *    · ekran YİNE hızlı kalır (50 satır çekiliyor),
 *    · rakam SESSİZCE sayfanın toplamına düşer,
 *    · ve kimse fark etmez — çünkü hiçbir şey hata vermez.
 *
 *  Bu, yavaşlıktan daha tehlikeli: yanlış rakam.
 *
 *  ⚠ BU BEKÇİ KAYNAK TARIYOR — ve niye: korunan şey bir HESAP değil, bir
 *  BAĞLANTI (hangi veri hangi gövdeden geliyor). Saf gövdeye taşınamaz.
 *  Ölçütler KULLANIM BLOĞUNA daraltılıyor, dosyanın tamamına değil.
 * ============================================================================
 */

let gecen = 0;
const dusen: string[] = [];

function kontrol(ad: string, kosul: boolean, ipucu?: string) {
  if (kosul) gecen++;
  else dusen.push(ad + (ipucu ? "\n       " + ipucu : ""));
}

/** ⚠ YORUMSUZ KOD — bir kuralı ANLATAN yorum, kuralı UYGULAMIŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * ⚠ SATIR SONU KAPISI. Bu depoda dosyaların bir kısmı CRLF, bir kısmı LF
 * (`alimlar/page.tsx` CRLF, `satislar/page.tsx` LF). Çok satırlı desen
 * yazarsa biri sessizce eşleşmez. Tek kapıdan normalleştiriliyor.
 */
function oku(yol: string): string {
  return yorumsuz(readFileSync(yol, "utf8")).replaceAll("\r\n", "\n");
}

const EKRANLAR = [
  {
    ad: "/satislar",
    yol: "src/app/satislar/page.tsx",
    dizi: "satislar",
    govde: "satisToplamlari",
    govdeYolu: "src/lib/satis-toplami.ts",
    model: "prisma.sale.findMany",
  },
  {
    ad: "/alimlar",
    yol: "src/app/alimlar/page.tsx",
    dizi: "alimlar",
    govde: "alimToplamlari",
    govdeYolu: "src/lib/alim-toplami.ts",
    model: "prisma.purchase.findMany",
  },
] as const;

console.log("\nSAYFALAMA ↔ TOPLAM BEKÇİSİ\n");

for (const e of EKRANLAR) {
  const kod = oku(e.yol);

  // ── ① SAYFALAMA GERÇEKTEN VAR MI ──────────────────────────────────────
  //  ⚠ Ölçüt LİSTE SORGUSUNUN gövdesine daraltılıyor: `take:` kelimesi
  //  dosyada başka sorgularda da geçebilir (ör. `take: 3` öneri listesi).
  const i = kod.indexOf(e.model);
  const sorgu = i === -1 ? "" : kod.slice(i, i + 900);
  kontrol(e.ad + " · liste sorgusu bulundu", sorgu !== "", e.model + " yok");
  kontrol(
    e.ad + " · sorgu SAYFALANIYOR (skip + take)",
    /skip:\s*sayfalama\.atla/.test(sorgu) && /take:\s*sayfalama\.boyut/.test(sorgu),
    "defterin tamamı çekiliyor — satır sayısıyla doğrusal büyüyen ekran",
  );

  // ── ② TOPLAM GÖVDEDEN GELİYOR MU ──────────────────────────────────────
  kontrol(
    e.ad + " · toplamlar veritabanı gövdesinden (" + e.govde + ")",
    new RegExp("await\\s+" + e.govde + "\\(kosul\\)").test(kod),
    "gövde çağrılmıyor — toplam nereden geliyor?",
  );

  // ── ③ TOPLAM SAYFADAN HESAPLANMIYOR ───────────────────────────────────
  //  ⛔ ASIL ÖLÇÜT BU. Sayfalanmış diziyi toplayan her ifade yasaktır.
  const yasak = new RegExp(
    "(suzgecToplami|adetToplami|hesaplananToplami)\\s*\\(\\s*" + e.dizi + "\\b",
  );
  kontrol(
    e.ad + " · toplam SAYFALANMIŞ diziden hesaplanmıyor",
    !yasak.test(kod),
    "`" + e.dizi + "` yalnız 50 satır taşıyor — ondan toplamak İlke #15'i çiğner",
  );
  kontrol(
    e.ad + " · kayıt sayısı da süzgecin TAMAMINDAN",
    !new RegExp("kayitSayisi\",\\s*\\{\\s*sayi:\\s*" + e.dizi + "\\.length").test(kod),
    "`" + e.dizi + ".length` sayfanın uzunluğu — 50 yazar, 5746 değil",
  );

  // ── ④ SAYFA DEĞİŞİNCE SÜZGEÇ KAYBOLMUYOR ──────────────────────────────
  const cubuk = kod.slice(kod.indexOf("<SayfalamaCubugu"), kod.indexOf("<SayfalamaCubugu") + 900);
  kontrol(
    e.ad + " · sayfalama çubuğu çiziliyor",
    kod.includes("<SayfalamaCubugu"),
    "sayfalandı ama kullanıcı 2. sayfaya GEÇEMİYOR",
  );
  kontrol(
    e.ad + " · çubuk süzgeçleri taşıyor (pencere + arama)",
    /pencere:/.test(cubuk) && /q:/.test(cubuk),
    "süzgeç taşınmıyor — 2. sayfa tıklaması listeyi sessizce sıfırlar",
  );

  // ── ⑤ GÖVDE İPTAL KOŞULUNU `AND` İLE EKLİYOR ──────────────────────────
  //  ⚠ Spread (`{ ...kosul, iptalTarihi: null }`) kullanıcının kendi iptal
  //  süzgecini SESSİZCE EZER. 17.08.2026'da bu sınıftan bir hata yaşandı.
  const govde = oku(e.govdeYolu);
  kontrol(
    e.ad + " · gövde iptal koşulunu AND ile ekliyor (spread DEĞİL)",
    /AND:\s*\[\s*kosul\s*,/.test(govde) && !/\{\s*\.\.\.kosul\s*,/.test(govde),
    "spread kullanıcının kendi süzgecini ezer",
  );
  kontrol(
    e.ad + " · gövde sayfa numarası ALMIYOR (toplam sayfadan bağımsız)",
    !/(sayfa|skip|take)\s*[:,)]/.test(govde.slice(govde.indexOf("export async function"))),
    "gövde sayfayı görüyorsa toplam sayfaya göre değişebilir",
  );
}

if (dusen.length === 0) {
  console.log("  ✓  " + gecen + "/" + gecen + " ölçüt geçti\n");
} else {
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("\n  " + dusen.length + " ölçüt DÜŞTÜ · " + gecen + " geçti\n");
  process.exitCode = 1;
}
