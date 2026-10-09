import { kaynakOku } from "./kaynak-oku";
import { kanalMagazaAdiCoz } from "../src/lib/kanal-magaza-adi";
import { ilanAdresi, ILAN_ADRESI_KALIPLARI, listeKanallariCoz, LISTE_KANALI_TAVANI, MAGAZA_ADI_KULLANAN_KANALLAR, VARSAYILAN_LISTE_KANALLARI } from "../src/lib/kanal-ilan-adresi";

/**
 * ============================================================================
 *  PAZARYERİ İLAN ADRESİ BEKÇİSİ (07.10.2026) — `npm run ilan-adresi:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — kalıplar ve firma seçimi DEĞERLE (ayrımın iki yakası: kimlik
 *     var/yok, geçerli/geçersiz kod, boş seçim/bozuk kayıt).
 *  ② YAZICI ZİNCİRİ — kimliği GERÇEKTEN yazan halkalar: TY okuyucu contentId'yi
 *     taşır → TY yazıcı `externalListingId`ye yazar ve ilan yoksa siler; N11
 *     betiği n11ProductId'yi geçirir → ortak yazıcı yazar; HB GÖNDERMEZ (alan
 *     ezilmez).
 *  ③ EKRAN — liste sütunu firma seçiminden, adres kalıptan; ayar formu kaydeder.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 3;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const oku = (y: string) => yorumsuz(kaynakOku(y));

console.log("=".repeat(70));
console.log("PAZARYERİ İLAN ADRESİ (07.10.2026)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
{
  /* K320 (09.10.2026): mağaza adı TEST VERİSİDİR, gerçek firma adı değil. */
  const MAGAZA = "ornekmagaza";
  const ty = ilanAdresi("TRENDYOL", { channelSku: "8690000000001", externalListingId: "1210365083", saticiId: "870249", magazaAdi: MAGAZA });
  kontrol("TY: contentId + satıcıdan adres (mağaza adı KULLANILMAZ)", ty === "https://www.trendyol.com/abc/xyz-p-1210365083?merchantId=870249", ty);
  kontrol("  ...contentId yoksa adres YOK (barkoddan uydurulmaz)",
    ilanAdresi("TRENDYOL", { channelSku: "8690000000001", externalListingId: null, saticiId: "870249", magazaAdi: null }) === null);
  kontrol("  ...sayısal olmayan kimlik adres üretmez",
    ilanAdresi("TRENDYOL", { channelSku: "x", externalListingId: "abc", saticiId: null, magazaAdi: null }) === null);
  /* Halil testi 09.10: mağaza belirtilmeyince HB ilanı buybox mağazasıyla açıyordu. */
  const hb = ilanAdresi("HEPSIBURADA", { channelSku: "HBCV00009BJWGJ", externalListingId: null, saticiId: null, magazaAdi: MAGAZA });
  kontrol("HB: kanal kodu + ?magaza= (kendi mağazamız açılır)", hb === "https://www.hepsiburada.com/x-p-HBCV00009BJWGJ?magaza=ornekmagaza", hb);
  const hbBos = ilanAdresi("HEPSIBURADA", { channelSku: "HBCV00009BJWGJ", externalListingId: null, saticiId: null, magazaAdi: null });
  kontrol("  ...mağaza adı boşsa EK YOK (uydurulmaz)", hbBos === "https://www.hepsiburada.com/x-p-HBCV00009BJWGJ", hbBos);
  kontrol("  ...boşluktan ibaret mağaza adı da EK üretmez",
    ilanAdresi("HEPSIBURADA", { channelSku: "HBCV00009BJWGJ", externalListingId: null, saticiId: null, magazaAdi: "  " }) === "https://www.hepsiburada.com/x-p-HBCV00009BJWGJ");
  kontrol("  ...HB kodu değilse (barkod) adres YOK",
    ilanAdresi("HEPSIBURADA", { channelSku: "8690000000001", externalListingId: null, saticiId: null, magazaAdi: MAGAZA }) === null);
  /* Halil testi 09.10: n11ProductId ana sayfaya düşüyordu; adresteki kimlik groupId (120395634). */
  const n11 = ilanAdresi("N11", { channelSku: "43020", externalListingId: "120395634", saticiId: null, magazaAdi: MAGAZA });
  kontrol("N11: groupId + ?magaza=", n11 === "https://www.n11.com/urun/x-120395634?magaza=ornekmagaza", n11);
  kontrol("  ...kimlik yoksa adres YOK", ilanAdresi("N11", { channelSku: "EN1", externalListingId: null, saticiId: null, magazaAdi: MAGAZA }) === null);
  kontrol("  ...mağaza adı kodlanır (adres bozulmaz)",
    ilanAdresi("N11", { channelSku: "x", externalListingId: "1", saticiId: null, magazaAdi: "a&b" }) === "https://www.n11.com/urun/x-1?magaza=a%26b");
  kontrol("kalıbı olmayan kanal adres ÜRETMEZ", ilanAdresi("AMAZON", { channelSku: "B0X", externalListingId: "1", saticiId: null, magazaAdi: MAGAZA }) === null);
  kontrol("kalıp tabanı dolu (TY · HB · N11)", ["TRENDYOL", "HEPSIBURADA", "N11"].every((k) => k in ILAN_ADRESI_KALIPLARI));
  /* Ekrandaki «mağaza adı» kutusu yalnız adı GERÇEKTEN kullanan kanallarda çıkar —
     küme kalıpların DAVRANIŞINDAN ölçülür (elle liste ile kalıp ayrışmasın). */
  const kullanan = Object.keys(ILAN_ADRESI_KALIPLARI).filter((kod) => {
    const kayit = { channelSku: "HBCV00009BJWGJ", externalListingId: "1", saticiId: null, magazaAdi: MAGAZA };
    return (ILAN_ADRESI_KALIPLARI[kod]!(kayit) ?? "").includes("magaza=" + MAGAZA);
  });
  kontrol("MAGAZA_ADI_KULLANAN_KANALLAR = adı linke koyan kalıplar (taban ≥2)",
    kullanan.length >= 2 && JSON.stringify([...kullanan].sort()) === JSON.stringify([...MAGAZA_ADI_KULLANAN_KANALLAR].sort()),
    { kalip: kullanan, beyan: MAGAZA_ADI_KULLANAN_KANALLAR });

  const tum = ["TRENDYOL", "HEPSIBURADA", "N11", "AMAZON", "PAZARAMA"];
  kontrol("seçim yok → varsayılan sıra TY · HB · N11",
    JSON.stringify(listeKanallariCoz(null, tum)) === JSON.stringify(VARSAYILAN_LISTE_KANALLARI));
  kontrol("bozuk kayıt → varsayılan (sessiz boş sütun yok)",
    JSON.stringify(listeKanallariCoz("{bozuk", tum)) === JSON.stringify(VARSAYILAN_LISTE_KANALLARI));
  kontrol("bilerek boş seçim «[]» → sütun yok", listeKanallariCoz("[]", tum).length === 0);
  const sira = listeKanallariCoz('["N11","AMAZON","N11","YOKKANAL","TRENDYOL","PAZARAMA"]', tum);
  kontrol("firma sırası korunur, tekrar/bilinmeyen atılır, tavan uygulanır",
    JSON.stringify(sira) === JSON.stringify(["N11", "AMAZON", "TRENDYOL"]) && sira.length === LISTE_KANALI_TAVANI, sira);
  kontrol("varsayılan da yalnız GEÇERLİ kodlardan (pasif kanal düşer)",
    JSON.stringify(listeKanallariCoz(null, ["TRENDYOL", "N11"])) === JSON.stringify(["TRENDYOL", "N11"]));
  kosanBolumler.push("kural");
}

console.log("\n2) yazıcı zinciri");
{
  const ty = oku("scripts/ty/urun-v2.ts");
  kontrol("TY okuyucu onaylı üründe contentId'yi taşır",
    /const icerikKimligi = dize\(ham\.contentId\);/.test(ty) && (ty.match(/^\s+icerikKimligi,$/gm) ?? []).length === 2);
  kontrol("  ...onaysız üründe BOŞ (vitrinde değil)", /urunUrl: "",\s*icerikKimligi: "",\s*\};/.test(ty));
  const tyYaz = oku("src/lib/kanal-listeleme-yaz.ts");
  kontrol("TY yazıcı değişen satırda kimliği YAZAR",
    /s\.externalListingId !== k\.ilan\) \{[\s\S]{0,200}?externalListingId: k\.ilan,/.test(tyYaz));
  kontrol("  ...ilan kanalda yoksa kimliği SİLER (ölü link kalmaz)",
    /data: \{ listelemeDurumu: "YOK", kanalAdet: null, kanalKdvOrani: null, externalListingId: null, kanalOlcumAt: an \}/.test(tyYaz));
  const ortak = oku("src/lib/kanal-listeleme-hb-yaz.ts");
  kontrol("ortak (HB/N11) yazıcı kimliği yalnız GÖNDERİLDİYSE yazar",
    /\.\.\.\(g\.ilanKimligi === undefined \? \{\} : \{ externalListingId: g\.ilanKimligi \}\)/.test(ortak));
  const n11 = oku("scripts/canli-n11-listeleme-yaz.ts");
  kontrol("N11 betiği groupId'yi kimlik olarak geçirir (n11ProductId DEĞİL — Halil testi 09.10)",
    /const ilan = l\.groupId === null[^\n]*String\(l\.groupId\)\.trim\(\);/.test(n11) && !/l\.n11ProductId/.test(n11) && /ilanKimligi: v\.ilan \}/.test(n11));
  kontrol("  ...mağaza adını kanalın KENDİ cevabından (sellerNickname) çözer ve ortak gövdeyle yazar",
    /const magaza = kanalMagazaAdiCoz\(listingler\.map\(\(l\) => l\.sellerNickname\)\);/.test(n11) &&
      /\(await kanalMagazaAdiniYaz\(prisma, hesap, magaza\)\)/.test(n11));
  /* Karar SAF gövdede — değerle (ayrımın iki yakası: tek ad / çok ad / boş). */
  kontrol("  ...TEK ad gelirse o ad (boşluk ve boş değer sayılmaz)", kanalMagazaAdiCoz(["AXC", " AXC ", "", null]) === "AXC");
  kontrol("  ...birden çok FARKLI ad gelirse null (biri seçilmez)", kanalMagazaAdiCoz(["AXC", "BAŞKA"]) === null);
  kontrol("  ...hiç ad gelmezse null", kanalMagazaAdiCoz([]) === null && kanalMagazaAdiCoz([undefined, ""]) === null);
  const yazGovde = oku("src/lib/kanal-magaza-adi.ts");
  kontrol("  ...yazım: ad yoksa ya da kayıtlıyla aynıysa YAZMAZ, farklıysa kanal hesabına yazar",
    /if \(ad === null \|\| hesap\.magazaAdi === ad\) return null;\s*await db\.channelAccount\.update\(\{ where: \{ id: hesap\.id \}, data: \{ magazaAdi: ad \} \}\);/.test(yazGovde));
  kontrol("  ...kimlik farkı da DEĞİŞİKLİK sayılır (yalnız durum/adet değil)",
    /s\.externalListingId !== bulunan\.ilan\)/.test(n11));
  const hb = oku("scripts/canli-hb-listeleme-yaz.ts");
  kontrol("HB betiği kimlik GÖNDERMEZ (kanal kodu zaten HBCV — alan ezilmez)", !/ilanKimligi/.test(hb));
  kosanBolumler.push("yazıcı");
}

console.log("\n3) ekran");
{
  const liste = oku("src/app/urunler/page.tsx");
  kontrol("liste sütunu FİRMA SEÇİMİNDEN (Company.urunListesiKanallari)",
    /listeKanallariCoz\(firmaAyari\?\.urunListesiKanallari \?\? null, aktifKanallar\.map\(\(k\) => k\.code\)\)/.test(liste));
  kontrol("  ...adres KALIPTAN, satış hesabının satıcı kimliğiyle",
    /ilanAdresi\(kod, \{ channelSku: k\.channelSku, externalListingId: k\.externalListingId, saticiId: k\.channelAccount\.externalId, magazaAdi: k\.channelAccount\.magazaAdi \}\)/.test(liste) &&
      /channelAccount: \{ select: \{ externalId: true, magazaAdi: true,/.test(liste));
  /* K320 (09.10.2026): mağaza adı kutusu — zincirin her halkası: çizilir · okur · doğrular · yazar. */
  const ayar = oku("src/app/ayarlar/kanallar/page.tsx");
  kontrol("Kanal Hesapları mağaza adı kutusunu adı kullanan kanalların satış hesaplarına çizer",
    /h\.satisIcin && h\.isActive && MAGAZA_ADI_KULLANAN_KANALLAR\.includes\(h\.channel\.code\)/.test(ayar) &&
      /\{magazaHesaplari\.map\(\(h\) => \(\s*<MagazaAdiFormu/.test(ayar));
  const form = oku("src/app/ayarlar/kanallar/magaza-adi-formu.tsx");
  kontrol("  ...form alanı adla gönderilir ve kayıtlı değeri GERİ VERİR",
    /name="magazaAdi"\s+defaultValue=\{hesap\.magazaAdi \?\? ""\}/.test(form) && /name="id" value=\{hesap\.id\}/.test(form));
  const tumEylem = oku("src/app/ayarlar/kanallar/actions.ts");
  const magazaBasi = tumEylem.indexOf("export async function kanalHesabiMagazaAdiKaydet");
  const magazaEylemi = magazaBasi >= 0 ? tumEylem.slice(magazaBasi) : "";
  kontrol("  ...eylem izin ister, formu OKUR, linki bozacak karakteri reddeder, yalnız satış hesabına yazar",
    magazaEylemi.length > 200 &&
      /yetkiIste\("ayar\.yaz"\)/.test(magazaEylemi) &&
      /String\(formData\.get\("magazaAdi"\) \?\? ""\)\.trim\(\)/.test(magazaEylemi) &&
      /if \(\/\[\\s\?&\/#\]\/\.test\(ham\)\) return \{ hata: tMagaza\("gecersiz"\) \};/.test(magazaEylemi) &&
      /if \(!hesap\.satisIcin\) return \{ hata: tMagaza\("yalnizSatis"\) \};/.test(magazaEylemi) &&
      /data: \{ magazaAdi: ham === "" \? null : ham \}/.test(magazaEylemi));
  kontrol("  ...kaydedince ürün listesi tazelenir (link hemen değişir)", /revalidatePath\("\/urunler"\);/.test(magazaEylemi));
  kontrol("  ...masaüstü tabloda ve telefon kartında ikisi de çizilir",
    (liste.match(/<PazaryeriLinkleri satirlar=\{pazaryeriSatirlari\(ana\?\.id\)\} metin=\{pazaryeriMetni\} \/>/g) ?? []).length === 2);
  const bilesen = oku("src/components/pazaryeri-linkleri.tsx");
  kontrol("link yeni sekmede, güvenli (noopener)", /target="_blank"\s+rel="noopener noreferrer"/.test(bilesen));
  kontrol("  ...«kodu yok» ile «link yok» AYRI yazılır", /s\.durum === "KAYIT_YOK" \? metin\.kayitYok : metin\.linkYok/.test(bilesen));
  const eylem = oku("src/app/ayarlar/kanallar/actions.ts");
  kontrol("ayar eylemi izin ister ve kodu VERİTABANINDAN doğrular",
    /listeKanallariniKaydet[\s\S]{0,400}?yetkiIste\("ayar\.yaz"\)[\s\S]{0,600}?if \(!gecerli\.has\(kod\)\) return \{ hata:/.test(eylem));
  kontrol("  ...firmanın kendi kaydına yazar", /where: \{ id: baglam\.companyId \},\s*data: \{ urunListesiKanallari: JSON\.stringify\(secilen\) \}/.test(eylem));
  kosanBolumler.push("ekran");
}

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
