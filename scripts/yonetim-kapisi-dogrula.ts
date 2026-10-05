import "dotenv/config";

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  SELLİORA YÖNETİM KAPISI — BEKÇİ (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run yonetim-kapisi:dogrula
 *
 *  Kullanıcı kararı 04.10.2026: Selliora firmaların ÜSTÜNDEKİ yönetim
 *  katmanıdır; girişi `/<teknik ad>` (05.10.2026 öncesi `/selliora`), yetki kişide (`User.isSuperAdmin`).
 *
 *  ① PROXY ÇAĞRILIR (desen aranmaz): gerçek `NextRequest`, gerçek imzalı
 *     jetonlarla — giriş açık; içerisi jetonsuz / firma jetonuyla 404;
 *     yönetim jetonuyla geçer ve katman başlığını KENDİSİ koyar; dışarıdan
 *     gelen katman başlığı firma yolunda SİLİNİR.
 *  ② SUNUCU KAPISI (kullanım bloğu): oturum okuması süper admin + aktif +
 *     sürüm + işaret sorar; giriş eylemi süper admin olmayanı reddeder.
 *  ③ DESEN YASAĞI: `src/app/<teknik ad>/` altında giriş dışındaki HER sayfa ve
 *     düzen `await yonetimSayfasi()` çağırır (liste tutulmaz, klasör taranır).
 *  ④ KÖK DÜZEN: yönetim katmanında firma oturumuna bakılmaz.
 * ============================================================================
 */

console.log("\nYÖNETİM KAPISI BEKÇİSİ\n");

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}
function yorumsuz(k: string): string {
  return k.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((x) => !x.trim().startsWith("//")).join("\n");
}
function govde(metin: string, bas: string): string {
  const i = metin.indexOf(bas);
  if (i < 0) return "";
  const j = metin.indexOf("\nexport ", i + bas.length);
  return metin.slice(i, j < 0 ? undefined : j);
}
function dosyalar(kok: string): string[] {
  const s: string[] = [];
  for (const ad of readdirSync(kok)) {
    const y = join(kok, ad);
    if (statSync(y).isDirectory()) s.push(...dosyalar(y));
    else s.push(y.replace(/\\/g, "/"));
  }
  return s;
}

async function main() {
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../src/proxy");
  const imza = await import("../src/lib/oturum-imza");
  const sir = process.env.OTURUM_SIRRI;
  if (!sir) { console.log("  ÖLÇÜLEMEDİ — OTURUM_SIRRI yok\n"); process.exit(1); }

  /* ① PROXY */
  const son = Date.now() + 3_600_000;
  const yonetimJetonu = await imza.jetonUret({ kullaniciId: "k1", oturumSurumu: 1, sonGecerlilik: son, firmaId: imza.YONETIM_ISARETI }, sir);
  const firmaJetonu = await imza.jetonUret({ kullaniciId: "k1", oturumSurumu: 1, sonGecerlilik: son, firmaId: "cfirmakimligi000" }, sir);
  const istek = (yol: string, cerez?: string, ekBaslik?: Record<string, string>) =>
    proxy(new NextRequest(`http://localhost${yol}`, { headers: { ...(cerez ? { cookie: cerez } : {}), ...(ekBaslik ?? {}) } }));
  const katmanKondu = (r: Response) => r.headers.get(`x-middleware-request-${imza.YONETIM_BASLIGI}`) === "1";
  const gecti = (r: Response) => r.headers.get("x-middleware-next") === "1";

  kontrol(`yol ölçütü: ${imza.YONETIM_YOLU} ve altı yönetim; ${imza.YONETIM_YOLU}X ve /giris değil`,
    imza.yonetimYoluMu(imza.YONETIM_YOLU) && imza.yonetimYoluMu(`${imza.YONETIM_YOLU}/firmalar`) && !imza.yonetimYoluMu(`${imza.YONETIM_YOLU}X`) && !imza.yonetimYoluMu("/giris"));
  const giris = await istek(imza.YONETIM_YOLU);
  kontrol(`giriş ekranı (${imza.YONETIM_YOLU}) jetonsuz AÇIK ve katman başlığını taşır`, gecti(giris) && katmanKondu(giris), giris.status);
  kontrol("içerisi JETONSUZ → 404", (await istek(`${imza.YONETIM_YOLU}/firmalar`)).status === 404);
  kontrol("içerisi FİRMA jetonuyla (firma çerezi) → 404", (await istek(`${imza.YONETIM_YOLU}/firmalar`, `${imza.OTURUM_CEREZI}=${firmaJetonu}`)).status === 404);
  kontrol("içerisi firma jetonu YÖNETİM çerezi adıyla → 404 (işaret tutmaz)", (await istek(`${imza.YONETIM_YOLU}/firmalar`, `${imza.YONETIM_CEREZI}=${firmaJetonu}`)).status === 404);
  kontrol("içerisi bozuk jetonla → 404", (await istek(`${imza.YONETIM_YOLU}/firmalar`, `${imza.YONETIM_CEREZI}=${yonetimJetonu}x`)).status === 404);
  const ic = await istek(`${imza.YONETIM_YOLU}/firmalar`, `${imza.YONETIM_CEREZI}=${yonetimJetonu}`);
  kontrol("içerisi YÖNETİM jetonuyla GEÇER ve katman başlığını taşır", gecti(ic) && katmanKondu(ic), ic.status);
  const sahte = await istek("/urunler", `${imza.OTURUM_CEREZI}=${firmaJetonu}`, { [imza.YONETIM_BASLIGI]: "1" });
  kontrol("firma yolunda DIŞARIDAN gelen katman başlığı SİLİNİR", gecti(sahte) && !katmanKondu(sahte),
    [...sahte.headers.entries()].filter(([k]) => k.includes("katman")));
  kosanBolumler.push("proxy");

  /* ② SUNUCU KAPISI */
  const ot = yorumsuz(kaynakOku("src/lib/yonetim-oturumu.ts"));
  const oku = govde(ot, "export async function yonetimOturumu(");
  kontrol("oturum okuması işareti sorar", oku.includes("if (!govde || govde.firmaId !== YONETIM_ISARETI) return null;"));
  kontrol("oturum okuması aktif + SÜPER ADMİN sorar (her istekte, veritabanından)", oku.includes("if (!k || !k.isActive || !k.isSuperAdmin) return null;"));
  kontrol("oturum okuması oturum sürümünü sorar", oku.includes("if (k.sessionVersion !== govde.oturumSurumu) return null;"));
  const sayfaKapisi = govde(ot, "export async function yonetimSayfasi(");
  kontrol("sayfa kapısı reddedileni 404'e gönderir", sayfaKapisi.includes('if (karar === "GIRIS_YOK" || !k) notFound();'));
  /* 05.10.2026 — süper admin ilk girişte parolasını değiştirir (kullanıcı kararı). */
  kontrol("sayfa kapısı parolası değişmeli kişiyi PAROLA ekranına gönderir", sayfaKapisi.includes('if (karar === "PAROLA") redirect(`${YONETIM_YOLU}/parola`);'));
  const eylemKapisi = govde(ot, "export async function yonetimEylemi(");
  kontrol("eylem kapısı yalnız TAMAM kararında kişiyi verir (parola değişmeli → null)", eylemKapisi.includes('return yonetimKapiKarari(k) === "TAMAM" ? k : null;'));
  {
    const { yonetimKapiKarari } = await import("../src/lib/yonetim-oturumu");
    const kisi = { id: "k", email: "e", ad: null };
    kontrol("karar: oturum yok → GIRIS_YOK", yonetimKapiKarari(null) === "GIRIS_YOK");
    kontrol("karar: parola değişmeli → PAROLA", yonetimKapiKarari({ ...kisi, parolaDegismeli: true }) === "PAROLA");
    kontrol("karar: parola tamam → TAMAM", yonetimKapiKarari({ ...kisi, parolaDegismeli: false }) === "TAMAM");
  }
  kontrol("çerez YALNIZ yönetim yolunda (path: YONETIM_YOLU)", govde(ot, "export async function yonetimOturumuAc(").includes("path: YONETIM_YOLU,"));
  const eylem = yorumsuz(kaynakOku("src/app/bezirga/actions.ts"));
  const gir = govde(eylem, "export async function yonetimGirisYap(");
  const iRet = gir.indexOf("if (!kullanici || !kullanici.isActive || !kullanici.isSuperAdmin || !gecti) {");
  const iAc = gir.indexOf("await yonetimOturumuAc(kullanici.id);");
  kontrol("giriş: süper admin olmayan REDDEDİLİR, oturum kapıdan SONRA açılır", iRet >= 0 && iAc > iRet);
  kosanBolumler.push("sunucu");

  /* ③ DESEN YASAĞI */
  const sayfalar = dosyalar("src/app/bezirga").filter((d) => /\/(page|layout)\.tsx$/.test(d) && d !== "src/app/bezirga/page.tsx");
  kontrol(`taban: yönetim altında giriş dışı sayfa/düzen var (${sayfalar.length} ≥ 2)`, sayfalar.length >= 2, sayfalar);
  /* Parola ekranı TEK istisna: kapısı `yonetimSayfasiParolaEkrani` (parola
     zorunluluğuna bakmaz, bakarsa kendine yönlendirirdi). */
  const PAROLA_EKRANI = "src/app/bezirga/parola/page.tsx";
  const korumasiz = sayfalar.filter((d) =>
    d === PAROLA_EKRANI
      ? !/await yonetimSayfasiParolaEkrani\(\)/.test(yorumsuz(kaynakOku(d)))
      : !/await yonetimSayfasi\(\)/.test(yorumsuz(kaynakOku(d))),
  );
  kontrol("yönetim altındaki HER sayfa ve düzen kendi kapısını çağırır", korumasiz.length === 0, korumasiz);
  kontrol("parola ekranı yönetim altında var", sayfalar.includes(PAROLA_EKRANI), sayfalar);
  /* Gevşek kapılar (parolaya bakmayan) YALNIZ parola ekranı ve parola eyleminde. */
  const modul = (d: string) => d.endsWith("yonetim-oturumu.ts");
  const gevsekSayfa = dosyalar("src").filter((d) => d !== PAROLA_EKRANI && !modul(d) && /\byonetimSayfasiParolaEkrani\(/.test(yorumsuz(kaynakOku(d))));
  kontrol("parolaya bakmayan SAYFA kapısı başka hiçbir yerde çağrılmaz", gevsekSayfa.length === 0, gevsekSayfa);
  const EYLEM_DOSYASI = "src/app/bezirga/actions.ts";
  const gevsekEylemBaska = dosyalar("src").filter((d) => d !== EYLEM_DOSYASI && !modul(d) && /\byonetimEylemiParolaEkrani\(/.test(yorumsuz(kaynakOku(d))));
  const parolaEylemi = govde(eylem, "export async function yonetimParolamiDegistir(");
  const gevsekEylemSayisi = (eylem.match(/\byonetimEylemiParolaEkrani\(/g) ?? []).length;
  kontrol(
    "parolaya bakmayan EYLEM kapısı yalnız parola eyleminde (başka dosyada yok, dosyada tek çağrı, o da parola eyleminde)",
    gevsekEylemBaska.length === 0 && gevsekEylemSayisi === 1 && parolaEylemi.includes("await yonetimEylemiParolaEkrani()"),
    { gevsekEylemBaska, gevsekEylemSayisi },
  );
  const iSil = parolaEylemi.indexOf("await yonetimOturumuKapat();");
  const iYon = parolaEylemi.indexOf("redirect(`${YONETIM_YOLU}?parola=degisti`);");
  kontrol("parola eylemi yönetim çerezini SİLER, yönlendirmeden ÖNCE (layout tazelenir)", iSil >= 0 && iYon >= 0 && iSil < iYon);
  kosanBolumler.push("desen");

  /* ④ KÖK DÜZEN */
  const kok = yorumsuz(kaynakOku("src/app/layout.tsx"));
  kontrol("kök düzen katmanı başlıktan okur", kok.includes("const yonetimKatmani = (await headers()).get(YONETIM_BASLIGI) === \"1\";"));
  kontrol("yönetim katmanında firma oturumu OKUNMAZ", kok.includes("const kullanici = yonetimKatmani ? null : await oturumdakiKullanici().catch(() => null);"));
  kontrol("yönetim katmanında /cikis yönlendirmesi YOK", kok.includes('if (!yonetimKatmani && oturumCerezi && !kullanici) redirect("/cikis");'));
  kosanBolumler.push("kok");

  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
