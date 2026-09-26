import { readFileSync, readdirSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { kimlikOku, baslikKur, tumSayfalar, UCLAR } from "./ty/istemci";
import { v2KayitlariniNormallestir } from "./ty/urun-v2";

/**
 * ============================================================================
 *  K121② — KANAL LİSTELEME DURUMUNU DEFTERE YAZ
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-kanal-listeleme-yaz.ts              → KURU
 *      npx tsx scripts/canli-kanal-listeleme-yaz.ts --yaz        → YAZAR
 *      ... --dosya      → API yerine son tarama DOSYASINI kullanır
 *
 *  BETIK SINIFI: SUREKLI — gece koşabilir; tekrar koşulabilir ve zararsız.
 *
 *  ⛔ VARSAYILAN KURU. Bayraksız koşum hiçbir şey yazmaz.
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ — yalnız okunur. Stok senkronu
 *  KAPSAM DIŞI (kullanıcı şartı 01.09.2026).
 *
 *  ⚠ YAZIM SATIR SATIR VE TEKRAR KOŞULABİLİR — tek dev işlem değil. Yarım
 *  kalırsa ikinci koşum kaldığı yerden devam eder.
 *  _(Kılavuz: yarım commit mümkün olan hiçbir betik canlıya koşmaz.)_
 * ============================================================================
 */

/**
 * ⛔ KOŞUMUN KANALI — İZE YAZILIR, TAHMİN EDİLMEZ.
 * Bu betik Trendyol API istemcisini çağırır; taradığı kanal yapısal olarak
 * bellidir. Panel kutusu koşum durumunu bu ada göre AYIRIR — iki kanal
 * ölçüldüğünde HB kutusunun altında TY'nin hatası yazmasın diye.
 * _(Ad bir VERİDİR: hesap kimlikle çözülür, bu yalnız izin etiketi.)_
 */
const KOSUM_KANALI = "Trendyol";

const YAZ = process.argv.includes("--yaz");
const DOSYADAN = process.argv.includes("--dosya");
const KLASOR = "veri/ozel";

async function taramaAl(): Promise<
  { tamam: true; saticiId: string; urunler: Record<string, unknown>[]; alindi: Date; kaynak: string }
  | { tamam: false; hata: string }
> {
  if (DOSYADAN) {
    const d = readdirSync(KLASOR)
      .filter((a) => a.startsWith("ty-urun-taramasi-") && a.endsWith(".json"))
      .sort()
      .at(-1);
    if (d === undefined) return { tamam: false, hata: "Tarama dosyası yok." };
    const ham = JSON.parse(readFileSync(`${KLASOR}/${d}`, "utf8")) as {
      saticiId: string;
      alindi: string;
      urunler: Record<string, unknown>[];
    };
    return {
      tamam: true,
      saticiId: ham.saticiId,
      urunler: ham.urunler,
      alindi: new Date(ham.alindi),
      kaynak: `dosya: ${d}`,
    };
  }

  const kimlik = kimlikOku();
  if (kimlik === null) return { tamam: false, hata: "TY kimliği okunamadı (.env.canli)." };

  /**
   * ⛔ v2 — İKİ UÇ (K181, 07.09.2026). Eski `/products` 15.09'da kapanıyor.
   *
   * ⚠ VE İKİSİ DE OKUNMADAN YAZIM YAPILMAZ: yalnız onaylı uç okunsaydı,
   * onay bekleyen 24 ürün listede HİÇ görünmez ve deftere `YOK` diye
   * damgalanırdı — "listelenmemiş" kovası gerçekte listede olan ürünlerle
   * şişerdi. Bir ucun düşmesi, ötekinin verisini de GEÇERSİZ kılar.
   */
  const baslik = baslikKur(kimlik);
  const cekilen: Record<string, unknown>[][] = [];
  let sayfaToplam = 0;
  for (const [ad, yolKur] of [
    ["onaylı", (sayfa: number) => UCLAR.onayliUrunler(kimlik.saticiId, sayfa)],
    ["onaysız", (sayfa: number) => UCLAR.onaysizUrunler(kimlik.saticiId, sayfa)],
  ] as const) {
    const s2 = await tumSayfalar(yolKur, baslik, 60);
    if (s2.tur === "HATA") {
      /** ⛔ HATA TAM TAŞINIR — kırpmak teşhisi kırpar. */
      return { tamam: false, hata: `Tarama düştü (${ad}): ` + JSON.stringify(s2.sonuc) };
    }
    if (s2.kesildiMi) {
      /**
       * ⛔ TAVANA ÇARPAN LİSTE TAM DEĞİLDİR — ve eksik listeyle yazmak,
       * gerçekte listede OLAN ürünleri `YOK` diye damgalardı.
       */
      return {
        tamam: false,
        hata: `Sayfa tavanına çarpıldı (${ad}) — liste EKSİK, yazım yapılmaz.`,
      };
    }
    cekilen.push(s2.kayitlar as Record<string, unknown>[]);
    sayfaToplam += s2.sayfa;
  }

  return {
    tamam: true,
    saticiId: kimlik.saticiId,
    /**
     * ⚠ NORMALLEŞTİRİLMİŞ SATIRLAR — v2'de bir içerik birden çok barkod
     * taşıyor, satır sayısı v1'dekinden fazla olacak ve bu kusur değil.
     */
    urunler: v2KayitlariniNormallestir({ onayli: cekilen[0], onaysiz: cekilen[1] }),
    alindi: new Date(),
    kaynak: `API v2 · ${sayfaToplam} sayfa`,
  };
}

/**
 * ⛔ KOŞUM SONUCU — ÇAĞIRAN OKUR, EKRANA BAKMAZ (K225, 21.09.2026).
 * Betik artık `/api/cron/listeleme-cekim` ucundan da koşuyor; orada
 * `console.log` kimseye ulaşmaz. "Koşmadı" ile "koştu, değişiklik yok"
 * AYRI döner — karıştırılırsa bayat veri temiz sanılır.
 */
export type TyListelemeOzeti =
  | { atlandi: "VERITABANI" | "TARAMA" | "HESAP" }
  | {
      kanal: "Trendyol";
      urun: number;
      yazilan: number;
      yokIsaretlenen: number;
      barkodsuzAtlanan: number;
      kanalKaydiYok: number;
      /** ⚠ Kuru koşumda hepsi 0'dır — HATA DEĞİL, kip. */
      yazdiMi: boolean;
      /** K273: ürün görseli yazımı (yoksa: yazılmadı ya da düştü — sebep günlükte). */
      gorsel?: import("../src/lib/urun-gorseli-yaz").GorselYazimOzeti | { hata: string };
      /** K283: kategori eşleşmesi yazımı. */
      kategori?: import("../src/lib/kategori-eslesme-yaz").KategoriYazimOzeti | { hata: string };
    };

export async function tyListelemeCekimKos(ayar: {
  yaz: boolean;
  /** Sunucudan gelirken hazır adres; yerelde `.env.canli`den okunur. */
  dbAdresi?: string;
}): Promise<TyListelemeOzeti> {
  const YAZ = ayar.yaz;

  let dbAdresi = ayar.dbAdresi ?? null;
  if (dbAdresi === null) {
    const y = canliYapilandirma();
    if (!y.tamam) {
      console.log("Canlı yapılandırma okunamadı:", y.hata);
      return { atlandi: "VERITABANI" };
    }
    dbAdresi = betikAdresi(y.veri.ham);
  }
  process.env.DATABASE_URL = dbAdresi;

  console.log("\nK121② — KANAL LİSTELEME DURUMU");
  console.log("  kip  " + (YAZ ? "⚠ YAZIM — defter DEĞİŞECEK" : "KURU — hiçbir şey yazılmaz"));
  console.log("=".repeat(70));

  const t = await taramaAl();
  if (!t.tamam) {
    console.log("\n   ⛔ " + t.hata);
    /**
     * ⛔ TARAMA DÜŞTÜĞÜNDE DE İZ YAZILIR. Yazılmasaydı panel kutusu eski
     * damgaya bakıp "48 saat oldu" derdi — YANLIŞ TEŞHİS: sorun geçen zaman
     * değil, koşumun DÜŞMESİ. İkisi farklı iş istiyor.
     */
    if (YAZ) {
      const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
      await kosumIziniYaz({ basarili: false, mesaj: t.hata, kosumKanali: KOSUM_KANALI });
    }
    /** ⚠ "Tarama düştü" ile "ürün yok" AYRI — biri hüküm, öteki değil. */
    return { atlandi: "TARAMA" };
  }
  console.log("\n   kaynak     " + t.kaynak);
  console.log("   satıcı     " + t.saticiId);
  console.log("   ürün       " + t.urunler.length);
  console.log("   ölçüm anı  " + t.alindi.toISOString());

  const { listelemeDurumu } = await import("../src/lib/kanal-listeleme");
  const dagilim = new Map<string, number>();
  for (const u of t.urunler) {
    const d = listelemeDurumu(u);
    dagilim.set(d, (dagilim.get(d) ?? 0) + 1);
  }
  console.log("\n   KANAL TARAFI DAĞILIMI");
  for (const [d, n] of [...dagilim].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${d.padEnd(16)} ${n}`);
  }

  if (!YAZ) {
    console.log("\n   " + "-".repeat(66));
    console.log("   KURU KOŞUM — hiçbir şey yazılmadı.");
    console.log("   Yazmak için sonuna --yaz ekleyin.");
    /** ⚠ KURU KOŞUM DA BİR SONUÇTUR — ürün sayısı döner, `yazdiMi` false. */
    return {
      kanal: KOSUM_KANALI,
      urun: t.urunler.length,
      yazilan: 0,
      yokIsaretlenen: 0,
      barkodsuzAtlanan: 0,
      kanalKaydiYok: 0,
      yazdiMi: false,
    };
  }

  const { listelemeDurumunuYaz } = await import("../src/lib/kanal-listeleme-yaz");
  /**
   * ⚠ SÜRE ÖLÇÜLÜR, TAHMİN EDİLMEZ. Cron ucu 21.09.2026'da 504 aldı ve
   * elimizde hiçbir sayı yoktu; yerelde "8 sn" görünen şey KURU koşumdu ve
   * yazım gövdesine HİÇ girmiyordu. İki kip ayrı ölçülür.
   */
  const tYazim = Date.now();
  const s = await listelemeDurumunuYaz({
    saticiId: t.saticiId,
    urunler: t.urunler,
    alindi: t.alindi,
  });

  console.log(`   [sure] yazim govdesi ${Date.now() - tYazim} ms`);
  console.log("\n   YAZIM SONUCU\n");
  if (s.hesap === null) {
    console.log("   ⛔ Bu satıcı kimliğine sahip kanal hesabı YOK — hiçbir şey yazılmadı.");
    const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
    await kosumIziniYaz({
      basarili: false,
      mesaj: `Satıcı kimliği ${t.saticiId} ile eşleşen kanal hesabı yok.`,
      kosumKanali: KOSUM_KANALI,
    });
    return { atlandi: "HESAP" };
  }
  console.log("   hesap                    " + s.hesap);
  console.log("   kontrol edilen           " + s.yazilan);
  /**
   * ⛔ "KONTROL EDİLEN" İLE "DEĞİŞEN" AYRI YAZILIR (K225-④).
   * Eskiden tek sayı vardı ve her koşumda 1083 diyordu — okuyan "1083 satır
   * yazıldı" sanıyordu. Ölçüldü 21.09.2026: 1097 satırın **1082'si
   * BİREBİR AYNIYDI**, yalnız 1'i farklıydı. Tek sayı, yapılan işi olduğundan
   * bin kat büyük gösteriyordu.
   */
  console.log("   GERÇEKTEN değişen        " + s.degisen);
  console.log("   kanalda YOK diye yazılan " + s.yokIsaretlenen);
  console.log("   barkodsuz (atlandı)      " + s.barkodsuzAtlanan);
  console.log("   kanal kaydı YOK (yazacak yer yok) " + s.kanalKaydiYok);
  console.log("\n   ⛔ Pazaryerine hiçbir şey yazılmadı.");

  /**
   * ⛔ BAŞARIDA DA İZ YAZILIR — VE BUNUN OLMAMASI BİR KUSURDU (01.09.2026).
   * `kosumIziniYaz`ın kendi belgesi _"İZ HER KOŞUMDA YAZILIR — başarıda da"_
   * diyordu; kod onu YALNIZ hesap bulunamadığında çağırıyordu. İki sonucu
   * vardı ve ikisi de sessiz:
   *   · bir kez düşen koşumdan sonra iz sonsuza kadar "BAŞARISIZ" kalırdı —
   *     sonraki başarılı koşumlar onu hiç temizlemezdi;
   *   · "hiç koşmadı" ile "koştu ve düzeldi" ayırt edilemezdi.
   * _(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur".)_
   */
  /**
   * K273 — ÜRÜN GÖRSELİ. Aynı taramadan, ek istek yok. Görsel yazımı düşerse
   * listeleme sonucu BOZULMAZ (ayrı iş) ama hata TAM günlüğe ve özete yazılır.
   */
  let gorsel: import("../src/lib/urun-gorseli-yaz").GorselYazimOzeti | { hata: string };
  try {
    const { gorselleriYaz } = await import("../src/lib/urun-gorseli-yaz");
    gorsel = await gorselleriYaz(
      /* Tarama tipi ham kayıt (`Record<string, unknown>`); alanlar String ile okunur. */
      t.urunler.map((u) => ({ barkod: String(u.barcode ?? ""), url: String(u.gorselUrl ?? ""), kaynak: "TRENDYOL" as const })),
    );
    console.log(`   görsel: aday ${gorsel.aday} · eşleşen ${gorsel.eslesen} · yazılan ${gorsel.yazilan} · sırada ${gorsel.tavandaKalan}`);
  } catch (e) {
    console.error("   ⛔ görsel yazımı düştü:", e);
    gorsel = { hata: e instanceof Error ? e.message : String(e) };
  }

  /**
   * K283 — ÜRÜN KATEGORİSİ TRENDYOL'UN KENDİ KATEGORİSİNDEN. Aynı taramadan, ek
   * istek yok. Karar saf kuraldan (`kategoriKarari`): karşılığı seçilmemiş TY
   * kategorisi yazılmaz (tahmin yok) · elle seçilmiş kategoriye dokunulmaz ·
   * KDV değişecekse yazılmaz. Düşerse listeleme sonucu bozulmaz, hata TAM yazılır.
   */
  let kategori: import("../src/lib/kategori-eslesme-yaz").KategoriYazimOzeti | { hata: string };
  try {
    const { tyKategorileriniYaz } = await import("../src/lib/kategori-eslesme-yaz");
    kategori = await tyKategorileriniYaz(
      t.urunler.map((u) => ({ barkod: String(u.barcode ?? ""), tyKategori: String(u.kategori ?? "") })),
    );
    console.log(
      `   kategori: yazılan ${kategori.kategoriYazilan} · TY kategorisi ${kategori.tyYazilan} · yeni TY kategorisi ${kategori.yeniTyKategori} · karşılıksız ${kategori.atlanan.KARSILIK_YOK} · KDV bekleyen ${kategori.atlanan.KDV_DEGISIR} · sırada ${kategori.tavandaKalan}`,
    );
  } catch (e) {
    console.error("   ⛔ kategori yazımı düştü:", e);
    kategori = { hata: e instanceof Error ? e.message : String(e) };
  }

  const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
  await kosumIziniYaz({
    basarili: true,
    mesaj: `${s.hesap} · yazılan ${s.yazilan} · YOK ${s.yokIsaretlenen} · barkodsuz ${s.barkodsuzAtlanan}`,
    kosumKanali: KOSUM_KANALI,
  });

  return {
    kanal: KOSUM_KANALI,
    urun: t.urunler.length,
    yazilan: s.yazilan,
    yokIsaretlenen: s.yokIsaretlenen,
    barkodsuzAtlanan: s.barkodsuzAtlanan,
    kanalKaydiYok: s.kanalKaydiYok,
    yazdiMi: true,
    gorsel,
    kategori,
  };
}

/**
 * ═══ İÇERİ ALINDIĞINDA KOŞMAZ ═══
 *
 * ⛔ `main().catch(...)` KALDIRILDI. Cron ucu bu dosyayı İÇERİ ALIYOR;
 * import'un yan etkiyle koşması, sunucu her ısındığında sessiz bir tarama
 * başlatırdı. Desen `canli-hb-hakedis-cekim.ts` ile AYNI.
 *
 * ⛔ ÇÖKÜŞTE DE İZ YAZILIR — VE HATA MESAJI TAM TAŞINIR.
 * Yakalanmamış hata, yutulmuş hatanın kardeşidir: betik patlarsa panel
 * kutusu bunu asla öğrenemez ve bayat damgayı "gece koşumu kaçmış" diye
 * okur — yanlış teşhis. _(Anayasa: "hata mesajını kısaltan her işlem
 * teşhisi kısaltır" — kırpma yalnız GÖSTERİMDE, kayıtta asla.)_
 *
 * ⚠ VE İZ YAZIMI ARTIK GÖVDENİN İÇİNDE DEĞİL, ÇAĞIRANIN SORUMLULUĞUNDA:
 * `tyListelemeCekimKosGuvenli` hem CLI'dan hem cron ucundan çağrılır, yani
 * iz iki yolda da yazılır. İki yerde iki kalıp olmaz (İlke #10).
 */
export async function tyListelemeCekimKosGuvenli(ayar: {
  yaz: boolean;
  dbAdresi?: string;
}): Promise<TyListelemeOzeti | { atlandi: "COKTU"; mesaj: string }> {
  try {
    return await tyListelemeCekimKos(ayar);
  } catch (e: unknown) {
    const mesaj = (e instanceof Error ? (e.stack ?? e.message) : String(e)).replace(
      /\r?\n/g,
      " ",
    );
    console.log("\n   ⛔ KOŞUM ÇÖKTÜ — " + mesaj);
    if (ayar.yaz) {
      try {
        const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
        await kosumIziniYaz({ basarili: false, mesaj, kosumKanali: KOSUM_KANALI });
      } catch {
        /** ⚠ İz de yazılamadıysa en azından ekranda duruyor — sessiz kalmıyor. */
        console.log("   ⛔ Koşum izi de YAZILAMADI.");
      }
    }
    return { atlandi: "COKTU", mesaj };
  }
}

const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-kanal-listeleme-yaz\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  void tyListelemeCekimKosGuvenli({ yaz: YAZ }).then(async (o) => {
    if ("atlandi" in o) process.exitCode = 1;
    /**
     * ⛔ BAĞLANTI YALNIZ CLI'DA KAPATILIR — GÖVDEDE DEĞİL.
     *
     * ⚠ ÖLÇÜLDÜ 21.09.2026: `--yaz` koşumu **251 sn** sürüyordu ve bu
     * SÜRENİN TAMAMI İŞ DEĞİLDİ — yazım gövdesi **1.134 ms**, tarama 8 sn.
     * Kalan ~242 sn, iş bittikten sonra sürecin KAPANMAMASIydı: yazım
     * yolunda Prisma bağlanıyor ve hiç kapatılmıyordu. (Kuru koşum 8 sn'de
     * bitiyordu çünkü orada Prisma HİÇ yüklenmiyor.)
     *
     * ⛔ Bu, "251 saniye" rakamını OPTİMİZE etmeye kalkan biri için tuzaktı:
     * kovalanacak iş yoktu, süre hayaletti.
     *
     * ⚠ GÖVDEYE KONULAMAZ: aynı gövdeyi cron ucu da çağırıyor ve orada
     * `prisma` sunucunun PAYLAŞILAN istemcisidir; kapatmak sonraki istekleri
     * bozardı. Kapatma yalnız BU sürece aittir.
     */
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
}
