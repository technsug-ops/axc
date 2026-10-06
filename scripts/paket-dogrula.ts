import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  PAKET BEKÇİSİ — K303 ② (kullanıcı kararı 30.09 + 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run paket:dogrula
 *
 *  ① katalog (saf, TERSTEN): her menü ekranı ya TAM BİR özelliğe aittir ya
 *     `HEP_ACIK`tadır — yarın eklenen ekran ikisine de yazılmazsa kırmızı ·
 *     başlangıç dağılımı belgedeki gibi (katmanlar birbirini kapsar,
 *     Finansman yalnız Individuel) · açık küme kuralı
 *  ② sözlük: her özelliğin adı, her bağımlılık uyarısı, her ekran adı var
 *  ③ gerçek veri: paketsiz firma YOK · paket içeriğinde tanımsız anahtar YOK ·
 *     hiçbir hazır pakette olmayan özellik ancak firmaya özel paket varken
 *  ④ gövde (geçici paket + firma): paket değişimi kapanan/açılanı doğru sayar ·
 *     Individuel'e geçiş seçimi BUGÜNKÜ kümeden kurar (bayat seçim dönmez) ·
 *     reddedilen yollar
 *  ⑤ bağ: firma açılışı paketi ZORUNLU yazar ve önce sınar · eylemler yönetim
 *     kapısından geçer
 * ============================================================================
 */

console.log("\nPAKET BEKÇİSİ\n");

const BOLUM_SAYISI = 6;
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
  const K = await import("../src/lib/paket/ozellikler");
  const { MENU_ADRESLERI } = await import("../src/lib/menu/katalog");
  const { YONETIM_YOLU } = await import("../src/lib/oturum-imza");

  /* ① KATALOG */
  console.log("① katalog (tersten sayım)");
  kontrol(`taban: özellik listesi dolu (${K.OZELLIKLER.length} ≥ 20)`, K.OZELLIKLER.length >= 20);
  kontrol("özellik anahtarları tekil", new Set(K.OZELLIKLER).size === K.OZELLIKLER.length);
  const ekranSahibi = new Map<string, string[]>();
  for (const o of K.OZELLIKLER) for (const e of K.OZELLIK_EKRANLARI[o]) ekranSahibi.set(e, [...(ekranSahibi.get(e) ?? []), o]);
  const menu = Object.keys(MENU_ADRESLERI);
  kontrol(`taban: menü kataloğu dolu (${menu.length} ≥ 40)`, menu.length >= 40);
  const sahipsiz = menu.filter((e) => !ekranSahibi.has(e) && !(K.HEP_ACIK as readonly string[]).includes(e));
  kontrol("her menü ekranı bir özelliğe ya da HEP_ACIK'a yazılı", sahipsiz.length === 0, sahipsiz);
  const ikili = [...ekranSahibi.entries()].filter(([, s]) => s.length > 1);
  kontrol("hiçbir ekran iki özelliğe ait değil", ikili.length === 0, ikili);
  const hayalet = [...ekranSahibi.keys(), ...K.HEP_ACIK].filter((e) => !(e in MENU_ADRESLERI));
  kontrol("özelliklerin ekranları menüde VAR (hayalet ekran yok)", hayalet.length === 0, hayalet);
  const hemAcikHemOzellik = K.HEP_ACIK.filter((e) => ekranSahibi.has(e));
  kontrol("HEP_ACIK ekranları hiçbir özelliğe bağlı değil", hemAcikHemOzellik.length === 0, hemAcikHemOzellik);
  kontrol("her özelliğin en az bir ekranı var (ekransız söz yok)", K.OZELLIKLER.every((o) => K.OZELLIK_EKRANLARI[o].length > 0));
  const b = new Map(K.BASLANGIC_PAKETLERI.map((p) => [p.ad, p]));
  const altKume = (a: string, u: string) => b.get(a)!.ozellikler.every((o) => b.get(u)!.ozellikler.includes(o));
  kontrol("başlangıç: Basic ⊂ Silver ⊂ Gold ⊂ Premium", altKume("Basic", "Silver") && altKume("Silver", "Gold") && altKume("Gold", "Premium"));
  kontrol("başlangıç: Basic 10 · Silver 14 · Gold 19 · Premium 23 (docs §2)", [b.get("Basic"), b.get("Silver"), b.get("Gold"), b.get("Premium")].map((p) => p?.ozellikler.length).join(",") === "10,14,19,23");
  kontrol("başlangıç: Finansman HİÇBİR hazır pakette yok (06.10: yalnız Individuel)", K.BASLANGIC_PAKETLERI.every((p) => !p.ozellikler.includes("finansman")));
  kontrol("başlangıç: tek firmaya özel paket (Individuel), içeriği boş", K.BASLANGIC_PAKETLERI.filter((p) => p.firmayaOzel).map((p) => `${p.ad}:${p.ozellikler.length}`).join() === "Individuel:0");
  kontrol("açık küme: paketsiz firma → BOŞ", K.acikOzellikler(null, ["satis"]).size === 0);
  kontrol("açık küme: firmaya özel pakette FİRMA seçimi okunur", [...K.acikOzellikler({ firmayaOzel: true, ozellikler: ["satis"] }, ["finansman"])].join() === "finansman");
  kontrol("açık küme: hazır pakette PAKET içeriği okunur", [...K.acikOzellikler({ firmayaOzel: false, ozellikler: ["satis"] }, ["finansman"])].join() === "satis");
  kontrol("bağımlılık: motor açık + tarifeler kapalı → 2 uyarı", K.eksikBagimliliklar(new Set(["hesaplamaMotoru"])).length === 2);
  kontrol("bağımlılık: motor + iki tarife açık → uyarı yok", K.eksikBagimliliklar(new Set(["hesaplamaMotoru", "komisyonTarifesi", "kargoTarifesi"])).length === 0);
  kosanBolumler.push("katalog");

  /* ② SÖZLÜK */
  console.log("\n② sözlük");
  for (const dil of ["tr", "en"] as const) {
    const s = JSON.parse(kaynakOku(`messages/${dil}.json`)) as Record<string, Record<string, unknown>>;
    const eksikAd = K.OZELLIKLER.filter((o) => !(o in (s.PaketOzelligi ?? {})));
    kontrol(`${dil}: her özelliğin adı var (PaketOzelligi)`, eksikAd.length === 0, eksikAd);
    const eksikBag = K.BAGIMLILIKLAR.map((x) => x.anahtar).filter((a) => !(a in (s.Yonetim ?? {})));
    kontrol(`${dil}: her bağımlılık uyarısının metni var`, eksikBag.length === 0, eksikBag);
    const eksikEkran = [...ekranSahibi.keys()].filter((e) => !(e in (s.Menu ?? {})));
    kontrol(`${dil}: özelliklerin ekran adları Menu sözlüğünde`, eksikEkran.length === 0, eksikEkran);
  }
  kosanBolumler.push("sozluk");

  /* ③ GERÇEK VERİ */
  console.log("\n③ gerçek veri");
  const { sistemPrisma } = await import("../src/lib/prisma");
  // SISTEM: bütün firmalar (salt okuma).
  const firmalar = await sistemPrisma.company.findMany({ select: { code: true, paketId: true } });
  kontrol(`taban: firma var (${firmalar.length} ≥ 1)`, firmalar.length >= 1);
  const paketsiz = firmalar.filter((f) => !f.paketId).map((f) => f.code);
  kontrol("paketsiz firma YOK", paketsiz.length === 0, paketsiz);
  // SISTEM: bütün paketler (salt okuma).
  const pk = await sistemPrisma.paket.findMany({ select: { ad: true, firmayaOzel: true, ozellikler: { select: { ozellik: true } } } });
  kontrol(`taban: paket var (${pk.length} ≥ 1)`, pk.length >= 1);
  const gecerli = new Set<string>(K.OZELLIKLER);
  const tanimsiz = pk.flatMap((p) => p.ozellikler.filter((o) => !gecerli.has(o.ozellik)).map((o) => `${p.ad}:${o.ozellik}`));
  kontrol("paket içeriğinde tanımsız anahtar YOK", tanimsiz.length === 0, tanimsiz);
  // SISTEM: firma seçimleri (salt okuma).
  const fsec = await sistemPrisma.firmaOzelligi.findMany({ select: { ozellik: true } });
  const fTanimsiz = fsec.filter((o) => !gecerli.has(o.ozellik)).map((o) => o.ozellik);
  kontrol("firma seçimlerinde tanımsız anahtar YOK", fTanimsiz.length === 0, fTanimsiz);
  const kapsanan = new Set(pk.filter((p) => !p.firmayaOzel).flatMap((p) => p.ozellikler.map((o) => o.ozellik)));
  const yetim = K.OZELLIKLER.filter((o) => !kapsanan.has(o));
  const ozelVar = pk.some((p) => p.firmayaOzel);
  console.log(`        (hiçbir hazır pakette olmayan: ${yetim.join(", ") || "yok"} · firmaya özel paket ${ozelVar ? "VAR" : "YOK"})`);
  kontrol("hazır pakette olmayan özellik ancak firmaya özel paket VARKEN (yoksa satılamaz)", yetim.length === 0 || ozelVar, yetim);
  kosanBolumler.push("veri");

  /* ④ GÖVDE */
  console.log("\n④ gövde (geçici paket + firma)");
  const Y = await import("../src/lib/paket/yonetim");
  // SISTEM: yazan — var olan süper admin (salt okuma).
  const yazan = await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true, hesapFirmasiId: null }, select: { id: true } });
  kontrol("taban: yazan süper admin var", Boolean(yazan));
  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  const izHedefleri: string[] = [];
  // SISTEM: geçici paketler — sonunda silinir.
  const P1 = await sistemPrisma.paket.create({ data: { ad: `ZZP1${ek}`, ozellikler: { create: [{ ozellik: "satis" }, { ozellik: "stok" }] } }, select: { id: true } });
  // SISTEM: ikinci geçici paket.
  const P2 = await sistemPrisma.paket.create({ data: { ad: `ZZP2${ek}`, ozellikler: { create: [{ ozellik: "satis" }, { ozellik: "finansman" }] } }, select: { id: true } });
  // SISTEM: geçici firmaya özel paket.
  const PO = await sistemPrisma.paket.create({ data: { ad: `ZZPO${ek}`, firmayaOzel: true }, select: { id: true } });
  // SISTEM: geçici firma.
  const F = await sistemPrisma.company.create({ data: { name: `ZZPF${ek}`, code: `ZPF${ek}`, paketId: P1.id }, select: { id: true } });
  izHedefleri.push(P1.id, P2.id, PO.id, F.id);
  try {
    const yid = yazan!.id;
    const acik = async () => [...((await Y.firmaPaketi(F.id))?.acik ?? [])].sort().join(",");
    kontrol("başlangıç: P1 → satis, stok", (await acik()) === "satis,stok");
    const d1 = await Y.firmaPaketiniDegistir(F.id, P2.id, yid);
    kontrol("P1 → P2: stok KAPANIR, finansman AÇILIR", d1.durum === "TAMAM" && d1.kapanan.join() === "stok" && d1.acilan.join() === "finansman", d1);
    kontrol("  ...açık küme = finansman, satis", (await acik()) === "finansman,satis");
    const d2 = await Y.firmaPaketiniDegistir(F.id, PO.id, yid);
    kontrol("P2 → Individuel: HİÇBİR şey kapanmaz/açılmaz (seçim bugünkü kümeden)", d2.durum === "TAMAM" && d2.kapanan.length === 0 && d2.acilan.length === 0, d2);
    const s1 = await Y.firmaOzellikleriniKaydet(F.id, ["satis", "panel"], yid);
    kontrol("Individuel seçimi: panel açılır, finansman kapanır", s1.durum === "TAMAM" && s1.eklenen.join() === "panel" && s1.cikan.join() === "finansman", s1);
    const s2 = await Y.firmaOzellikleriniKaydet(F.id, ["satis", "uydurma"], yid);
    kontrol("tanımsız anahtar REDDEDİLİR", s2.durum === "HATA" && s2.hata === "OZELLIK_GECERSIZ", s2);
    await Y.firmaPaketiniDegistir(F.id, P1.id, yid);
    const s3 = await Y.firmaOzellikleriniKaydet(F.id, ["satis"], yid);
    kontrol("hazır paketteki firmada seçim REDDEDİLİR (OZEL_DEGIL)", s3.durum === "HATA" && s3.hata === "OZEL_DEGIL", s3);
    // P1 (satis, stok) → Individuel: bayat seçim (satis, panel) geri DÖNMEMELİ.
    const d3 = await Y.firmaPaketiniDegistir(F.id, PO.id, yid);
    kontrol("Individuel'e yeniden geçiş: BAYAT seçim dönmez (açık = satis, stok)", d3.durum === "TAMAM" && (await acik()) === "satis,stok", { d3, acik: await acik() });
    const i1 = await Y.paketIceriginiKaydet(PO.id, ["satis"], yid);
    kontrol("firmaya özel paketin içeriği yazılamaz (FIRMAYA_OZEL)", i1.durum === "HATA" && i1.hata === "FIRMAYA_OZEL", i1);
    const i2 = await Y.paketIceriginiKaydet(P1.id, ["satis", "panel"], yid);
    kontrol("paket içeriği: panel eklenir, stok çıkar", i2.durum === "TAMAM" && i2.eklenen.join() === "panel" && i2.cikan.join() === "stok", i2);
    const a1 = await Y.paketKaydet(P2.id, { ad: `ZZP1${ek}`, aciklama: "", tutar: "", paraBirimi: "", donem: "" }, yid);
    kontrol("paket adı tekil (AD_VAR)", a1.durum === "HATA" && a1.hata === "AD_VAR", a1);
    const a2 = await Y.paketKaydet(P2.id, { ad: `ZZP2${ek}`, aciklama: "", tutar: "1.250,50", paraBirimi: "EUR", donem: "YILLIK" }, yid);
    // SISTEM: geçici paketin öneri fiyatı.
    const p2 = await sistemPrisma.paket.findUnique({ where: { id: P2.id }, select: { onerilenTutar: true, onerilenParaBirimi: true, onerilenDonem: true } });
    kontrol("önerilen fiyat yazıldı (1250.5 EUR yıllık)", a2.durum === "TAMAM" && p2?.onerilenTutar?.toString() === "1250.5" && p2.onerilenParaBirimi === "EUR" && p2.onerilenDonem === "YILLIK", { ...p2, onerilenTutar: p2?.onerilenTutar?.toString() });
    const a3 = await Y.paketKaydet(P2.id, { ad: `ZZP2${ek}`, aciklama: "", tutar: "abc", paraBirimi: "EUR", donem: "YILLIK" }, yid);
    kontrol("bozuk önerilen tutar REDDEDİLİR", a3.durum === "HATA" && a3.hata === "TUTAR_GECERSIZ", a3);
  } finally {
    // SISTEM: temizlik — firma (seçimleri kaskadla gider) önce, paketler sonra.
    await sistemPrisma.company.delete({ where: { id: F.id } });
    // SISTEM: temizlik.
    await sistemPrisma.paket.deleteMany({ where: { id: { in: [P1.id, P2.id, PO.id] } } });
    // SISTEM: temizlik — geçici kayıtların izleri.
    await sistemPrisma.auditLog.deleteMany({ where: { targetId: { in: izHedefleri } } });
    // SISTEM: ölçüm.
    kontrol("geçici paketler ve firma silindi", (await sistemPrisma.company.count({ where: { id: F.id } })) === 0 && (await sistemPrisma.paket.count({ where: { id: { in: [P1.id, P2.id, PO.id] } } })) === 0);
  }
  kosanBolumler.push("govde");

  /* ⑤ BAĞ */
  console.log("\n⑤ bağ");
  const acilis = yorumsuz(kaynakOku("src/lib/firma-acilisi.ts"));
  const fa = acilis.slice(acilis.indexOf("export async function firmaAc("), acilis.indexOf("export async function firmaAcilisiniTamamla("));
  const iSina = fa.indexOf('hata: "PAKET_YOK"');
  const iYaz = fa.indexOf("company.create({ data: { name: g.ad, code: g.kod, isActive: false, paketId }");
  kontrol("firma açılışı paketi SINAR, sonra paketle YAZAR", fa.length > 0 && iSina >= 0 && iYaz >= 0 && iSina < iYaz, { iSina, iYaz });
  const { readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dosyalar = (kok: string): string[] =>
    readdirSync(kok).flatMap((ad) => {
      const y = join(kok, ad).replace(/\\/g, "/");
      if (y.startsWith("src/generated")) return [];
      return statSync(y).isDirectory() ? dosyalar(y) : /\.tsx?$/.test(y) ? [y] : [];
    });
  const tumu = dosyalar("src");
  kontrol(`taban: src taraması dolu (${tumu.length} ≥ 300)`, tumu.length >= 300);
  const paketsizAcan = tumu.filter((y) => {
    const kod = yorumsuz(kaynakOku(y));
    const d = /\.company\.create\(\{/g;
    for (let m = d.exec(kod); m; m = d.exec(kod)) if (!/paketId/.test(kod.slice(m.index, m.index + 200))) return true;
    return false;
  });
  kontrol("src'de firma açan HER yer paketi yazar", paketsizAcan.length === 0, paketsizAcan);
  const yeni = yorumsuz(kaynakOku("src/app/bezirga/(ic)/firmalar/actions.ts"));
  kontrol("yeni firma eylemi formdaki paketi açılışa verir", yeni.includes('String(formData.get("paketId") ?? ""),'));
  const pe = yorumsuz(kaynakOku("src/app/bezirga/(ic)/paketler/actions.ts"));
  for (const [dosya, metin, ad, govde] of [
    ["paketler", pe, "yeniPaketEylemi", "await paketKaydet(null"],
    ["paketler", pe, "paketBilgisiEylemi", "await paketKaydet(id"],
    ["paketler", pe, "paketIcerigiEylemi", "await paketIceriginiKaydet("],
    ["firmalar", yeni, "firmaPaketiEylemi", "await firmaPaketiniDegistir("],
    ["firmalar", yeni, "firmaOzellikleriEylemi", "await firmaOzellikleriniKaydet("],
  ] as const) {
    const i = metin.indexOf(`export async function ${ad}(`);
    const j = metin.indexOf("\nexport ", i + 10);
    const g = i < 0 ? "" : metin.slice(i, j < 0 ? undefined : j);
    const kapi = g.indexOf("await yonetimEylemi()");
    const cagri = g.indexOf(govde);
    kontrol(`${dosya}/${ad}: yönetim kapısı ÖNCE, sonra ${govde.replace("await ", "").split("(")[0]}`, g.length > 0 && kapi >= 0 && cagri > kapi, { var: g.length > 0, kapi, cagri });
  }
  kosanBolumler.push("bag");

  /* ⑥ UYGULAMA TARAFI (2. adım) */
  console.log("\n⑥ uygulama: adres → özellik, sayfa kapısı, menü kilidi");
  const coz = (y: string) => K.adresinOzelligi(y, MENU_ADRESLERI);
  for (const [y, beklenen] of [
    ["/", "panel"], ["/satislar/123", "satis"], ["/rapor", "donemRaporu"], ["/rapor/urunler", "urunAnalizi"],
    ["/paketle", "depo"], ["/paket", null], ["/kanallar", "panel"], ["/ayarlar/hb-kargo-tarife", "kargoTarifesi"],
    ["/ayarlar/menu", null], ["/kart/abc", "karlilikKarti"], ["/finansman", "finansman"],
  ] as const) kontrol(`adres ${y} → ${beklenen ?? "paket dışı"}`, coz(y) === beklenen, coz(y));
  const basicKilit = K.kilitliEkranlar(new Set(b.get("Basic")!.ozellikler));
  kontrol("Basic: okut ve finansman KİLİTLİ, satışlar AÇIK", basicKilit.okut === "depo" && basicKilit.finansman === "finansman" && !("satislar" in basicKilit), basicKilit);
  const bosKilit = K.kilitliEkranlar(new Set());
  kontrol("hiç özellik yokken bile HEP_ACIK ekranlar kilitlenmez", K.HEP_ACIK.every((e) => !(e in bosKilit)));
  kontrol("kilit adresi açıklama sayfasına gider", K.kilitAdresi("depo") === "/paket?ozellik=depo");

  // Bütün sayfa rotaları TERSTEN: her biri bir özelliğe, HEP_ACIK ekranına ya da beyanlı paket dışına düşer.
  const sayfalar = tumu.filter((y) => y.startsWith("src/app/") && y.endsWith("/page.tsx") || y === "src/app/page.tsx");
  const rota = (d: string) => "/" + d.slice("src/app".length).split("/").filter((p) => p && p !== "page.tsx" && !(p.startsWith("(") && p.endsWith(")"))).join("/");
  const hepAcikAdres = K.HEP_ACIK.map((e) => MENU_ADRESLERI[e]).filter((a): a is string => Boolean(a));
  const onekte = (y: string, o: string) => y === o || y.startsWith(`${o}/`);
  const beyansiz = sayfalar.map(rota).filter((y) => {
    const ornek = y.replace(/\[[^\]]+\]/g, "x");
    // Yönetim katmanı: firma paketi uygulanmaz (yolu tek sabitten).
    if (onekte(ornek, YONETIM_YOLU)) return false;
    return !coz(ornek) && !hepAcikAdres.some((a) => onekte(ornek, a)) && !K.PAKET_DISI_ROTALAR.some((p) => onekte(ornek, p.onek));
  });
  kontrol(`taban: sayfa rotası bulundu (${sayfalar.length} ≥ 90)`, sayfalar.length >= 90);
  kontrol("HER sayfa ya bir özelliğe ya HEP_ACIK'a ya da beyanlı paket dışına düşer", beyansiz.length === 0, beyansiz);
  const yutan = K.PAKET_DISI_ROTALAR.filter((p) => coz(p.onek) !== null).map((p) => p.onek);
  kontrol("paket dışı beyanı bir özelliğin adresini YUTMUYOR", yutan.length === 0, yutan);

  const proxy = yorumsuz(kaynakOku("src/proxy.ts"));
  const pGovde = proxy.slice(proxy.indexOf("export async function proxy("), proxy.indexOf("async function yonetimKapisi("));
  const iBaslik = pGovde.indexOf("basliklar.set(PAKET_YOL_BASLIGI, yol);");
  const iAcik = pGovde.indexOf("if (acikMi(yol))");
  const iSon = pGovde.lastIndexOf("return NextResponse.next({ request: { headers: basliklar } });");
  kontrol("proxy adres başlığını HER firma isteğinde, ilk dallanmadan ÖNCE yazar", iBaslik >= 0 && iAcik > iBaslik && iSon > iBaslik, { iBaslik, iAcik, iSon });
  const yetki = yorumsuz(kaynakOku("src/lib/yetki/index.ts"));
  for (const ad of ["sayfaIzni", "sayfaGirisi"]) {
    const i = yetki.indexOf(`export async function ${ad}(`);
    const g = i < 0 ? "" : yetki.slice(i, yetki.indexOf("\n}", i));
    const iKapi = g.indexOf("await paketKapisi(baglam.companyId);");
    const iBaglam = g.indexOf("notFound();");
    kontrol(`${ad}: oturum kapısından SONRA paket halkasını çağırır`, g.length > 0 && iBaglam >= 0 && iKapi > iBaglam, { iBaglam, iKapi });
  }
  const erisim = yorumsuz(kaynakOku("src/lib/paket/erisim.ts"));
  kontrol("paket halkası kapalı özellikte açıklama sayfasına yönlendirir", erisim.includes("if (!(await firmaAcikOzellikleri(firmaId)).has(ozellik)) redirect(kilitAdresi(ozellik));"));
  const kok = yorumsuz(kaynakOku("src/app/layout.tsx"));
  // Kullanıcı kararı 06.10.2026: kapalı özellikler menüde GÖRÜNMEZ (önceki «kilitle çiz» çevrildi).
  const ornekDuzen = { gunluk: ["satislar", "okut"], gruplar: [{ anahtar: "grupPara", ogeler: ["finansman"] }, { anahtar: "grupX", ogeler: ["giderler", "kartlar"] }], yeni: 1 };
  const suzulmus = K.duzendenCikar(ornekDuzen, { okut: "depo", finansman: "finansman", kartlar: "kartlar" });
  kontrol("düzen süzgeci kapalı ekranları ÇIKARIR, açıkları ve öteki alanları korur", suzulmus.gunluk.join() === "satislar" && suzulmus.gruplar[0]!.ogeler.length === 0 && suzulmus.gruplar[1]!.ogeler.join() === "giderler" && suzulmus.yeni === 1, suzulmus);
  kontrol("kök düzen menüyü SÜZÜLMÜŞ düzenle çizer ve kümeyi alt çubuğa verir", kok.includes("const duzen = duzendenCikar(hamDuzen, kilitli);") && kok.includes("<AppSidebar eposta={kullanici.email} duzen={duzen} />") && kok.includes("<AltCubuk kilitli={kilitli} />") && kok.includes("await firmaKilitliEkranlari(baglam.companyId)"));
  kontrol("telefon menüsü SÜZÜLMÜŞ düzenle çizer", yorumsuz(kaynakOku("src/app/menu/page.tsx")).includes("const duzen = duzendenCikar(hamDuzen, kilitli);"));
  kontrol("hızlı işlemler kapalı işi ÇİZMEZ", yorumsuz(kaynakOku("src/app/hizli-islemler.tsx")).includes("if (!href || !Ikon || anahtar in kilitli) return null;"));
  const alt = yorumsuz(kaynakOku("src/components/alt-cubuk.tsx"));
  kontrol("alt çubuk kapalı sekmeyi ATLAR ve sütun sayısı kalan sekmeden", alt.includes("const sekmeler = ALT_CUBUK_SEKMELERI.filter((s) => !(s in kilitli));") && alt.includes("{sekmeler.map((sekme) => {") && alt.includes("repeat(${sekmeler.length}, minmax(0, 1fr))"));
  kosanBolumler.push("uygulama");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
