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

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

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
      await kosumIziniYaz({ basarili: false, mesaj: t.hata });
    }
    process.exitCode = 1;
    return;
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
    return;
  }

  const { listelemeDurumunuYaz } = await import("../src/lib/kanal-listeleme-yaz");
  const s = await listelemeDurumunuYaz({
    saticiId: t.saticiId,
    urunler: t.urunler,
    alindi: t.alindi,
  });

  console.log("\n   YAZIM SONUCU\n");
  if (s.hesap === null) {
    console.log("   ⛔ Bu satıcı kimliğine sahip kanal hesabı YOK — hiçbir şey yazılmadı.");
    const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
    await kosumIziniYaz({
      basarili: false,
      mesaj: `Satıcı kimliği ${t.saticiId} ile eşleşen kanal hesabı yok.`,
    });
    process.exitCode = 1;
    return;
  }
  console.log("   hesap                    " + s.hesap);
  console.log("   kanalda bulunup yazılan  " + s.yazilan);
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
  const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
  await kosumIziniYaz({
    basarili: true,
    mesaj: `${s.hesap} · yazılan ${s.yazilan} · YOK ${s.yokIsaretlenen} · barkodsuz ${s.barkodsuzAtlanan}`,
  });
}

/**
 * ⛔ ÇÖKÜŞTE DE İZ YAZILIR — VE HATA MESAJI TAM TAŞINIR.
 * Yakalanmamış hata, yutulmuş hatanın kardeşidir: betik patlarsa panel
 * kutusu bunu asla öğrenemez ve bayat damgayı "gece koşumu kaçmış" diye
 * okur — yanlış teşhis. _(Anayasa: "hata mesajını kısaltan her işlem
 * teşhisi kısaltır" — kırpma yalnız GÖSTERİMDE, kayıtta asla.)_
 */
main().catch(async (e: unknown) => {
  const mesaj = (e instanceof Error ? (e.stack ?? e.message) : String(e)).replace(
    /\r?\n/g,
    " ",
  );
  console.log("\n   ⛔ KOŞUM ÇÖKTÜ — " + mesaj);
  if (YAZ) {
    try {
      const { kosumIziniYaz } = await import("../src/lib/kanal-listeleme-yaz");
      await kosumIziniYaz({ basarili: false, mesaj });
    } catch {
      /** ⚠ İz de yazılamadıysa en azından ekranda duruyor — sessiz kalmıyor. */
      console.log("   ⛔ Koşum izi de YAZILAMADI.");
    }
  }
  process.exitCode = 1;
});
