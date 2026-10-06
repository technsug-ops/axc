import "dotenv/config";

import { existsSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  YÖNETİM İSKELETİ BEKÇİSİ — referans iskelet (HA-Kompass admin, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run yonetim-iskeleti:dogrula
 *
 *  ① saf etiketler: «Firmalar nerede?» parçaları her firmayı TAM BİRİNE düşürür ·
 *     ödeme/askı/kurulum/paket/sınır etiketleri doğru durumda yanar
 *  ② sayı = liste (gerçek DB): Ödemeler'in «gecikti» sayısı = etiket sayısı
 *     (menü rozeti + Bugün) · etiket sayısı = o etiketle süzülen liste
 *  ③ menü: her öğenin hedef sayfası VAR (bağlantının hedefi var mı) · seçili öğe
 *     en uzun eşleşmeyle
 *  ④ bağ: kabuk rozetleri tek kaynaktan · Bugün bağlantıları süzgeç adresinden ·
 *     liste `durum`la süzer · e-posta «sorunlu» süzgeci rozetle AYNI ölçüt ·
 *     giriş «Bugün»e gider (iki yer)
 * ============================================================================
 */

console.log("\nYÖNETİM İSKELETİ BEKÇİSİ\n");

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}
function yorumsuz(k: string): string {
  return k.replace(/\r/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

async function main() {
  const D = await import("../src/lib/yonetim/durumlar");

  /* ① SAF ETİKETLER */
  console.log("① etiketler");
  const gun = new Date(Date.UTC(2026, 9, 6));
  const dun = new Date(Date.UTC(2026, 9, 5));
  const yarin = new Date(Date.UTC(2026, 9, 7));
  const temel = { aktif: true, uyariSonGun: null, uyariSebebi: null, askiSebebi: null, sonrakiOdemeGunu: null, paketVar: true } as const;
  const e = (f: Partial<Parameters<typeof D.etiketleriHesapla>[0]>, kurulum: "TAM" | "YARIM" | "PASIF" = "TAM", sinir = false) => D.etiketleriHesapla({ ...temel, ...f }, kurulum, sinir, gun);
  const DURAK = ["AKTIF", "UYARIDA", "UYARI_DOLDU", "ASKIDA", "YARIM_KURULUM"];
  const durumlar = [
    e({}), e({ uyariSonGun: yarin, uyariSebebi: "ODEME_GECIKMESI" }), e({ uyariSonGun: dun, uyariSebebi: "ODEME_GECIKMESI" }),
    e({ aktif: false, askiSebebi: "DIGER" }, "PASIF"), e({ aktif: false }, "YARIM"), e({ sonrakiOdemeGunu: dun, paketVar: false }, "TAM", true),
  ];
  kontrol("her firma «Firmalar nerede?» parçalarından TAM BİRİNE düşer", durumlar.every((l) => l.filter((x) => DURAK.includes(x)).length === 1), durumlar);
  kontrol("normal firma → yalnız AKTIF", JSON.stringify(e({})) === JSON.stringify(["AKTIF"]));
  kontrol("uyarı süresi dolmuş → UYARI_DOLDU (AKTIF değil)", e({ uyariSonGun: dun }).includes("UYARI_DOLDU") && !e({ uyariSonGun: dun }).includes("AKTIF"));
  kontrol("yarım kurulum → YARIM_KURULUM, askı etiketi YOK", JSON.stringify(e({ aktif: false }, "YARIM").filter((x) => DURAK.includes(x))) === JSON.stringify(["YARIM_KURULUM"]));
  kontrol("paketsiz + gecikmiş ödeme + sınır dolu → üçü birden", ["PAKETSIZ", "ODEME_GECIKTI", "SINIR_DOLU"].every((x) => e({ sonrakiOdemeGunu: dun, paketVar: false }, "TAM", true).includes(x as never)));
  kontrol("vade bugün → yaklaşıyor, gecikmiş DEĞİL", e({ sonrakiOdemeGunu: gun }).includes("ODEME_YAKLASIYOR") && !e({ sonrakiOdemeGunu: gun }).includes("ODEME_GECIKTI"));
  kontrol("askıdaki ve aktif firma YAPILACAK sayılmaz", !D.YAPILACAK_ETIKETLERI.includes("ASKIDA") && !D.YAPILACAK_ETIKETLERI.includes("AKTIF"));
  kontrol("süzgeç adresi tek üretici (durum + çekmece)", D.firmalarAdresi("ODEME_GECIKTI", "x").endsWith("/firmalar?durum=ODEME_GECIKTI&ac=x") && D.firmalarAdresi().endsWith("/firmalar"));
  kosanBolumler.push("etiket");

  /* ② SAYI = LİSTE (gerçek DB) */
  console.log("\n② sayı = liste (gerçek veritabanı)");
  const { odemeGenelBakisi } = await import("../src/lib/odeme-takibi");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const an = new Date();
  const ozetler = await D.firmaOzetleriniHesapla(an);
  // SISTEM: ölçüm — firma sayısı (salt okuma).
  const firmaSayisi = await sistemPrisma.company.count();
  kontrol(`taban: özet her firmayı kapsar (${ozetler.length} = ${firmaSayisi})`, ozetler.length === firmaSayisi && firmaSayisi >= 1);
  const sayilar = D.etiketSayilari(ozetler);
  const g = await odemeGenelBakisi(an);
  const gecikenOdeme = g.firmalar.filter((f) => f.durum.tur === "GECIKTI").length;
  kontrol(`Ödemeler «gecikti» = menü rozeti/Bugün (${gecikenOdeme} = ${sayilar.get("ODEME_GECIKTI") ?? 0})`, gecikenOdeme === (sayilar.get("ODEME_GECIKTI") ?? 0));
  const yaklasan = g.firmalar.filter((f) => f.durum.tur === "YAKLASIYOR").length;
  kontrol(`Ödemeler «7 gün içinde» = etiket (${yaklasan} = ${sayilar.get("ODEME_YAKLASIYOR") ?? 0})`, yaklasan === (sayilar.get("ODEME_YAKLASIYOR") ?? 0));
  const parcaToplam = DURAK.reduce((a, x) => a + (sayilar.get(x as never) ?? 0), 0);
  kontrol(`«Firmalar nerede?» parçaları toplamı = firma sayısı (${parcaToplam} = ${ozetler.length})`, parcaToplam === ozetler.length);
  const toplam = await D.buAyTahsilat(an);
  kontrol("Bugün tahsilatı = Ödemeler bu ay toplamı (aynı gövde)", JSON.stringify(toplam) === JSON.stringify(g.buAyToplam));
  kosanBolumler.push("sayi");

  /* ③ MENÜ */
  console.log("\n③ menü");
  const M = await import("../src/lib/yonetim/menu");
  const { YONETIM_YOLU } = await import("../src/lib/oturum-imza");
  const ogeler = M.YONETIM_MENUSU.flatMap((x) => [...x.ogeler]);
  kontrol(`taban: menü dolu (${ogeler.length} ≥ 6)`, ogeler.length >= 6);
  const hedefsiz = ogeler.filter((o) => {
    const yol = M.YONETIM_ADRESLERI[o].slice(YONETIM_YOLU.length);
    return !existsSync(`src/app/bezirga/(ic)${yol}/page.tsx`);
  });
  kontrol("her menü öğesinin hedef sayfası VAR", hedefsiz.length === 0, hedefsiz);
  kontrol("seçili öğe: firma kartı → Firmalar · bugün → Bugün", M.seciliOge(`${YONETIM_YOLU}/firmalar/abc`) === "firmalar" && M.seciliOge(M.YONETIM_ANA) === "bugun" && M.seciliOge("/baska") === null);
  const menuSoz = (JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>).YonetimMenu ?? {};
  const eksik = [...ogeler, ...M.YONETIM_MENUSU.map((x) => x.grup)].filter((a) => !menuSoz[a]);
  kontrol("menü öğe ve grup adları sözlükte", eksik.length === 0, eksik);
  kosanBolumler.push("menu");

  /* ④ BAĞ */
  console.log("\n④ bağ");
  const kabuk = yorumsuz(kaynakOku("src/app/bezirga/(ic)/layout.tsx"));
  kontrol("kabuk rozetleri tek kaynaktan (firmaOzetleri + gonderilemeyenEpostaSayisi)", kabuk.includes("const [ozetler, gonderilemeyen] = await Promise.all([firmaOzetleri(), gonderilemeyenEpostaSayisi()]);") && kabuk.includes('odemeler: { sayi: sayilar.get("ODEME_GECIKTI") ?? 0, sicak: true },'));
  const bugun = yorumsuz(kaynakOku("src/app/bezirga/(ic)/bugun/page.tsx"));
  kontrol("Bugün yapılacak satırları süzgeç adresine götürür", bugun.includes("<Link href={firmalarAdresi(e)}") && bugun.includes("const yapilacaklar = YAPILACAK_ETIKETLERI.filter((e) => (sayilar.get(e) ?? 0) > 0);"));
  const liste = yorumsuz(kaynakOku("src/app/bezirga/(ic)/firmalar/page.tsx"));
  kontrol("firmalar listesi `durum`la AYNI etiketten süzer", liste.includes("(!durum || f.etiketler.includes(durum))"));
  const eposta = yorumsuz(kaynakOku("src/app/bezirga/(ic)/eposta/page.tsx"));
  const durumlarKaynak = yorumsuz(kaynakOku("src/lib/yonetim/durumlar.ts"));
  kontrol("e-posta «sorunlu» süzgeci rozetle AYNI ölçüt (sorunluEpostalar)", eposta.includes("sorunlu ? await sorunluEpostalar()") && durumlarKaynak.includes("return (await sorunluEpostalar(an)).length;"));
  const giris = yorumsuz(kaynakOku("src/app/bezirga/actions.ts"));
  const kapi = yorumsuz(kaynakOku("src/app/bezirga/page.tsx"));
  kontrol("giriş sonrası ve açık oturum «Bugün»e gider (iki yer)", giris.includes("`${YONETIM_YOLU}/parola` : YONETIM_ANA") && kapi.includes("`${YONETIM_YOLU}/parola` : YONETIM_ANA"));
  kosanBolumler.push("bag");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
